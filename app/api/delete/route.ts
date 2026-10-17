import { deleteAll } from "./service";

export async function DELETE() {
  try {
    await deleteAll();
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not delete the articles." }, { status: 500 });
  }
}
