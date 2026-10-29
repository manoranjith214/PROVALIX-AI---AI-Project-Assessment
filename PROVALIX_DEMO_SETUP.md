# PROVALIX AI — PRESENTATION DEMO SETUP GUIDE

This guide provides instructions for launching, seeding, and logging into the brand-new presentation demo environment for **PROVALIX AI: Automated Student Project Evaluation Platform**.

---

## 1. Credentials & Account Details

A dedicated, isolated presentation demo account has been provisioned. It is completely independent of real student accounts and previous demo records.

| Attribute | Presentation Demo Value |
| :--- | :--- |
| **Demo Email** | `presenter.demo@provalix.ai` |
| **Permanent Provalix User ID** | `PRV-95001` |
| **Full Name** | Alex Morgan (Demo Presenter) |
| **Role** | Student (Final Year, 4th Year) |
| **Department** | Artificial Intelligence & Data Science |
| **Institution** | Apex Institute of Technology & Research |
| **Presentation Password** | `Provalix@Demo2026!` *(Configurable via `DEMO_USER_PASSWORD` in `.env`)* |
| **Login Web URL** | [http://localhost:5173/login](http://localhost:5173/login) |
| **Backend API URL** | [http://localhost:5000/api](http://localhost:5000/api) |

> [!TIP]
> You can sign in using **either** the email address (`presenter.demo@provalix.ai`) **or** the Permanent User ID (`PRV-95001`) on the login screen.

---

## 2. One-Click Demo Seeding Commands

The demo environment is automated, repeatable, and idempotent. Running the seed command multiple times will **never create duplicate records**.

### Seed / Verify Demo Account
To create or refresh the presentation demo account and all linked records:

```bash
# From repository root
npm run seed:demo

# Or directly from backend
cd backend
npm run seed:demo
```

### Clean Demo Reset (Optional)
If you wish to cleanly purge and re-initialize only the presentation demo records without affecting any production or student data:

```bash
# From repository root
npm run seed:demo:reset
```

> [!NOTE]
> The reset command strictly filters by `presenter.demo@provalix.ai`, `PRV-95001`, `CLS-ECO26`, and `TM-ECO01`. It will never modify or delete real student records (`manoranjith214@gmail.com`, `pavithrasrinivasan1312@gmail.com`, etc.) or previous demo accounts (`demo@provalix.ai`).

---

## 3. Starting the Application for Presentation

Start the frontend and backend servers concurrently:

```bash
# From repository root
npm run dev
```

Alternatively, run them in separate terminal tabs:

```bash
# Terminal 1 — Backend API
npm run dev:backend

# Terminal 2 — Frontend UI
npm run dev:frontend
```

Open your browser to:
**[http://localhost:5173/login](http://localhost:5173/login)**

---

## 4. Step-by-Step Presentation Login Walkthrough

1. Navigate to **[http://localhost:5173/login](http://localhost:5173/login)**.
2. In the **Email or User ID** input, type:
   ```text
   presenter.demo@provalix.ai
   ```
   *(Or type `PRV-95001`)*
3. In the **Password** field, type:
   ```text
   Provalix@Demo2026!
   ```
4. Click **Sign In**.
5. You will immediately be routed to the **Dashboard** (`/dashboard`), with all statistics, recent reports, team affiliations, deadlines, and classroom leaderboard rankings pre-populated and ready for live presentation.
