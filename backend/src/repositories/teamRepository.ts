import { prisma } from '../config/prisma';
import { safeUserSelect } from './userRepository';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export class TeamRepository {
  async findById(id: string) {
    if (!id || typeof id !== 'string') return null;

    const t = await prisma.team.findUnique({
      where: { id },
      include: {
        captain: { select: safeUserSelect },
        createdBy: { select: safeUserSelect },
        members: {
          include: {
            user: { select: safeUserSelect },
          },
        },
        invitations: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });
    if (t) return t;

    // Check if team exists in Supabase "teams" table (which uses UUID for id)
    if (isUuid(id)) {
      try {
        const sbRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "teams" WHERE id = $1::uuid LIMIT 1`,
          id
        );
        if (sbRows && sbRows.length > 0) {
          const row = sbRows[0];
          return {
            id: row.id,
            name: row.name,
            code: row.code,
            logo: row.logo,
            maxSize: row.max_size || 4,
            status: row.status || 'Active',
            captainId: row.captain_id || row.user_id,
            createdById: row.user_id || row.captain_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            captain: {
              id: row.captain_id || row.user_id,
              name: row.captain_name || 'Captain',
              email: row.captain_email || '',
              permanentId: row.captain_permanent_id || '',
            },
            createdBy: {
              id: row.user_id || row.captain_id,
              name: row.captain_name || 'Creator',
              email: row.captain_email || '',
              permanentId: row.captain_permanent_id || '',
            },
            members: Array.isArray(row.members)
              ? row.members.map((m: any) => ({
                  id: m.id || m.userId,
                  teamId: row.id,
                  userId: m.userId || m.id,
                  role: m.role || 'MEMBER',
                  user: {
                    id: m.userId || m.id,
                    name: m.name || 'Member',
                    email: m.email || '',
                    permanentId: m.permanentId || '',
                  },
                }))
              : [],
            invitations: Array.isArray(row.invitations) ? row.invitations : [],
            submissions: Array.isArray(row.submissions) ? row.submissions : [],
            _fromSupabaseTable: true,
          };
        }
      } catch (err: any) {
        if (err?.code !== '42P01') {
          console.error('[teamRepository.findById] Query error on "teams" table:', err?.message || err);
          throw err;
        }
      }
    }

    return null;
  }

  async findByCode(code: string) {
    if (!code || typeof code !== 'string') return null;

    const t = await prisma.team.findUnique({
      where: { code },
      include: {
        captain: { select: safeUserSelect },
        members: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });
    if (t) return t;

    try {
      const sbRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "teams" WHERE code = $1 LIMIT 1`,
        code
      );
      if (sbRows && sbRows.length > 0) {
        return this.findById(sbRows[0].id);
      }
    } catch {}

    return null;
  }

  async listUserTeams(userId: string) {
    const prismaTeams = await prisma.team.findMany({
      where: {
        OR: [
          { captainId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        captain: { select: safeUserSelect },
        members: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    try {
      const sbRows: any[] = isUuid(userId)
        ? await prisma.$queryRawUnsafe(
            `SELECT id FROM "teams" WHERE user_id = $1::uuid OR captain_id = $1 ORDER BY created_at DESC`,
            userId
          )
        : await prisma.$queryRawUnsafe(
            `SELECT id FROM "teams" WHERE captain_id = $1 ORDER BY created_at DESC`,
            userId
          );

      if (sbRows && sbRows.length > 0) {
        const teamIds = new Set(prismaTeams.map((pt) => pt.id));
        for (const row of sbRows) {
          if (!teamIds.has(row.id)) {
            const mapped = await this.findById(row.id);
            if (mapped) prismaTeams.push(mapped as any);
          }
        }
      }
    } catch (err: any) {
      if (err?.code !== '42P01') {
        console.error('[teamRepository.listUserTeams] Query error on "teams" table:', err?.message || err);
        throw err;
      }
    }

    return prismaTeams;
  }

  async create(data: { name: string; code: string; logo?: string; maxSize: number; captainId: string; createdById: string }) {
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: data.name,
          code: data.code,
          logo: data.logo,
          maxSize: data.maxSize,
          captainId: data.captainId,
          createdById: data.createdById,
        },
      });

      // Captain automatically added as first member with CAPTAIN role
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: data.captainId,
          role: 'CAPTAIN',
        },
      });

      return tx.team.findUnique({
        where: { id: team.id },
        include: {
          captain: { select: safeUserSelect },
          members: {
            include: {
              user: { select: safeUserSelect },
            },
          },
        },
      });
    }, { maxWait: 15000, timeout: 30000 });
  }

  async update(id: string, data: { name?: string; logo?: string; maxSize?: number; status?: string }) {
    return prisma.team.update({
      where: { id },
      data,
      include: {
        captain: { select: safeUserSelect },
        members: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });
  }

  async countSubmissions(teamId: string) {
    if (!teamId || typeof teamId !== 'string') return 0;

    const prismaCount = await prisma.submission.count({
      where: { teamId },
    });
    if (prismaCount > 0) return prismaCount;

    if (isUuid(teamId)) {
      try {
        const sbRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT submissions FROM "teams" WHERE id = $1::uuid LIMIT 1`,
          teamId
        );
        if (sbRows && sbRows.length > 0 && Array.isArray(sbRows[0].submissions)) {
          return sbRows[0].submissions.length;
        }
      } catch (err: any) {
        if (err?.code !== '42P01') {
          console.error('[teamRepository.countSubmissions] Query error on "teams" table:', err?.message || err);
          throw err;
        }
      }
    }

    return 0;
  }

  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Delete associated safe dependent records if present in Prisma tables
      try {
        await tx.classroomTeamParticipation.deleteMany({ where: { teamId: id } });
      } catch {}
      try {
        await tx.teamInvitation.deleteMany({ where: { teamId: id } });
      } catch {}
      try {
        await tx.teamMember.deleteMany({ where: { teamId: id } });
      } catch {}
      try {
        await tx.team.delete({ where: { id } });
      } catch {}

      // 2. Also delete from Supabase "teams" table if present (with UUID cast)
      if (isUuid(id)) {
        try {
          await tx.$executeRawUnsafe(
            `DELETE FROM "teams" WHERE id = $1::uuid`,
            id
          );
        } catch (err: any) {
          if (err?.code !== '42P01') {
            console.error('[teamRepository.delete] Error deleting from "teams" table:', err?.message || err);
            throw err;
          }
        }
      }

      return { success: true };
    }, { maxWait: 15000, timeout: 30000 });
  }

  async createOrUpdateParticipation(classroomId: string, teamId: string, status: string) {
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "ClassroomTeamParticipation" WHERE "classroomId" = $1 AND "teamId" = $2`,
      classroomId, teamId
    );

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "ClassroomTeamParticipation"
         SET "status" = $1, "requestedAt" = NOW()
         WHERE "id" = $2`,
        status, existing[0].id
      );
      return this.findParticipationById(existing[0].id);
    } else {
      const id = (await import('crypto')).randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ClassroomTeamParticipation" ("id", "classroomId", "teamId", "status", "requestedAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        id, classroomId, teamId, status
      );
      return this.findParticipationById(id);
    }
  }

  async findParticipationById(id: string) {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.*,
              c.name as "classroomName", c.code as "classroomCode", c.deadline as "classroomDeadline",
              c."submissionMode" as "classroomMode", c.status as "classroomStatus", c."ownerId" as "classroomOwnerId",
              t.name as "teamName", t.code as "teamCode", t.logo as "teamLogo", t."maxSize" as "teamMaxSize",
              t."captainId" as "teamCaptainId"
       FROM "ClassroomTeamParticipation" p
       JOIN "Classroom" c ON c.id = p."classroomId"
       JOIN "Team" t ON t.id = p."teamId"
       WHERE p.id = $1`,
      id
    );
    return rows[0] || null;
  }

  async findClassroomParticipation(classroomId: string, teamId: string) {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.*,
              c.name as "classroomName", c.code as "classroomCode", c.deadline as "classroomDeadline",
              c."submissionMode" as "classroomMode", c.status as "classroomStatus", c."ownerId" as "classroomOwnerId",
              t.name as "teamName", t.code as "teamCode", t.logo as "teamLogo", t."maxSize" as "teamMaxSize",
              t."captainId" as "teamCaptainId"
       FROM "ClassroomTeamParticipation" p
       JOIN "Classroom" c ON c.id = p."classroomId"
       JOIN "Team" t ON t.id = p."teamId"
       WHERE p."classroomId" = $1 AND p."teamId" = $2`,
      classroomId, teamId
    );
    return rows[0] || null;
  }

  async listTeamClassroomParticipations(teamId: string) {
    try {
      const records = await prisma.classroomTeamParticipation.findMany({
        where: { teamId },
        include: {
          classroom: {
            include: {
              owner: { select: safeUserSelect },
            },
          },
          team: true,
        },
        orderBy: { requestedAt: 'desc' },
      });

      return records.map((p: any) => ({
        ...p,
        classroomName: p.classroom?.name,
        classroomCode: p.classroom?.code,
        classroomDeadline: p.classroom?.deadline,
        classroomMode: p.classroom?.submissionMode,
        classroomStatus: p.classroom?.status,
        classroomOwnerId: p.classroom?.ownerId,
        classroomOwnerName: p.classroom?.owner?.name,
        teamName: p.team?.name,
        teamCode: p.team?.code,
        teamLogo: p.team?.logo,
        teamMaxSize: p.team?.maxSize,
        teamCaptainId: p.team?.captainId,
      }));
    } catch {
      return [];
    }
  }

  async listClassroomTeamParticipations(classroomId: string) {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.*,
              t.name as "teamName", t.code as "teamCode", t.logo as "teamLogo", t."maxSize" as "teamMaxSize",
              t."captainId" as "teamCaptainId", u.name as "captainName", u.email as "captainEmail",
              u."permanentId" as "captainPermanentId"
       FROM "ClassroomTeamParticipation" p
       JOIN "Team" t ON t.id = p."teamId"
       JOIN "User" u ON u.id = t."captainId"
       WHERE p."classroomId" = $1
       ORDER BY p."requestedAt" DESC`,
      classroomId
    );
    return rows;
  }

  async updateParticipationStatus(id: string, status: string, reviewedById?: string) {
    await prisma.$executeRawUnsafe(
      `UPDATE "ClassroomTeamParticipation"
       SET "status" = $1, "reviewedAt" = NOW(), "reviewedById" = $2
       WHERE "id" = $3`,
      status, reviewedById || null, id
    );
    return this.findParticipationById(id);
  }

  async deleteParticipation(id: string) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "ClassroomTeamParticipation" WHERE "id" = $1`,
      id
    );
    return { success: true };
  }


  async createInvitation(teamId: string, userId: string) {
    return prisma.teamInvitation.create({
      data: {
        teamId,
        userId,
        status: 'Pending',
      },
      include: {
        user: { select: safeUserSelect },
      },
    });
  }

  async findInvitationById(inviteId: string) {
    return prisma.teamInvitation.findUnique({
      where: { id: inviteId },
      include: {
        team: true,
        user: { select: safeUserSelect },
      },
    });
  }

  async getUserInvitations(userId: string) {
    return prisma.teamInvitation.findMany({
      where: {
        userId,
        status: 'Pending',
      },
      include: {
        team: {
          include: {
            captain: { select: safeUserSelect },
            members: {
              include: {
                user: { select: safeUserSelect },
              },
            },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  async updateInvitationStatus(inviteId: string, status: 'Accepted' | 'Rejected') {
    return prisma.teamInvitation.update({
      where: { id: inviteId },
      data: {
        status,
        respondedAt: new Date(),
      },
    });
  }

  async addMember(teamId: string, userId: string, role = 'MEMBER') {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
      include: {
        user: { select: safeUserSelect },
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    return prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });
  }

  async transferCaptain(teamId: string, newCaptainId: string) {
    return prisma.$transaction(async (tx) => {
      // Update team captainId
      const currentTeam = await tx.team.findUnique({ where: { id: teamId } });
      if (!currentTeam) throw new Error('Team not found');

      await tx.team.update({
        where: { id: teamId },
        data: { captainId: newCaptainId },
      });

      // Update old captain member role to MEMBER
      await tx.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId: currentTeam.captainId,
          },
        },
        data: { role: 'MEMBER' },
      });

      // Update new captain member role to CAPTAIN
      await tx.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId: newCaptainId,
          },
        },
        data: { role: 'CAPTAIN' },
      });

      return tx.team.findUnique({
        where: { id: teamId },
        include: {
          captain: { select: safeUserSelect },
          members: {
            include: {
              user: { select: safeUserSelect },
            },
          },
        },
      });
    }, { maxWait: 15000, timeout: 30000 });
  }
}

export const teamRepository = new TeamRepository();
