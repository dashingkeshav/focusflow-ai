import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // 1. External release asset redirect (recommended for serverless platforms like Vercel)
    const externalUrl = process.env.EXTENSION_DOWNLOAD_URL || process.env.NEXT_PUBLIC_EXTENSION_DOWNLOAD_URL;
    if (externalUrl && externalUrl.startsWith("https://")) {
      return NextResponse.redirect(externalUrl, 302);
    }

    // 2. Local filesystem fallback for containerized / standalone Node.js environments
    const candidatePaths = [
      path.join(process.cwd(), "public", "downloads", "FocusFlow-Chrome-Extension.zip"),
      path.join(process.cwd(), "frontend", "public", "downloads", "FocusFlow-Chrome-Extension.zip"),
    ];

    let filePath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: "Extension archive not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.promises.readFile(/*turbopackIgnore: true*/ filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="FocusFlow-Chrome-Extension.zip"',
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Error serving extension download:", err);
    return NextResponse.json(
      { error: "Failed to download extension archive" },
      { status: 500 }
    );
  }
}
