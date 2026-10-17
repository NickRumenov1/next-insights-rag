import { saveUpload, UploadError } from "./service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    return Response.json({ article: await saveUpload(formData.get("file")) });
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return Response.json({ error: "Could not read that file." }, { status: 500 });
  }
}
