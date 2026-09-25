import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [workspaceA, workspaceB] = await Promise.all([
    db.workspace.create({ data: { name: `Isolation A ${suffix}` } }),
    db.workspace.create({ data: { name: `Isolation B ${suffix}` } })
  ]);

  try {
    await db.feedback.createMany({
      data: [
        { content: "Workspace A private feedback", channel: "test", workspaceId: workspaceA.id },
        { content: "Workspace B private feedback", channel: "test", workspaceId: workspaceB.id }
      ]
    });

    const scopedRows = await db.feedback.findMany({
      where: { workspaceId: workspaceA.id },
      select: { content: true, workspaceId: true }
    });

    if (
      scopedRows.length !== 1 ||
      scopedRows[0].workspaceId !== workspaceA.id ||
      scopedRows[0].content !== "Workspace A private feedback"
    ) {
      throw new Error("Tenant isolation check failed: workspace A received unexpected rows.");
    }

    console.log("Tenant isolation check passed: workspace A cannot see workspace B feedback.");
  } finally {
    await db.workspace.deleteMany({
      where: { id: { in: [workspaceA.id, workspaceB.id] } }
    });
  }
}

main()
  .catch((error) => {
    console.error("Tenant isolation check failed.", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
