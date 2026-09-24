import { prisma } from '../config/prisma';
import { safeUserSelect } from './userRepository';

export class TeamRepository {
  async findById(id: string) {
    return prisma.team.findUnique({
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
  }

  async findByCode(code: string) {
    return prisma.team.findUnique({
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
  }

  async listUserTeams(userId: string) {
    return prisma.team.findMany({
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
    return prisma.submission.count({
      where: { teamId },
    });
  }

  async delete(id: string) {
    return prisma.team.delete({
      where: { id },
    });
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
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.*,
              c.name as "classroomName", c.code as "classroomCode", c.deadline as "classroomDeadline",
              c."submissionMode" as "classroomMode", c.status as "classroomStatus", c."ownerId" as "classroomOwnerId",
              u.name as "classroomOwnerName",
              t.name as "teamName", t.code as "teamCode", t.logo as "teamLogo", t."maxSize" as "teamMaxSize"
       FROM "ClassroomTeamParticipation" p
       JOIN "Classroom" c ON c.id = p."classroomId"
       JOIN "Team" t ON t.id = p."teamId"
       JOIN "User" u ON u.id = c."ownerId"
       WHERE p."teamId" = $1
       ORDER BY p."requestedAt" DESC`,
      teamId
    );
    return rows;
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
