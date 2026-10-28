import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const GITHUB_EXTENSION_DOWNLOAD_URL =
  "https://github.com/dashingkeshav/focusflow-ai/raw/main/frontend/public/downloads/FocusFlow-Chrome-Extension.zip";

export async function GET(request: NextRequest) {
  try {
    // 1. External release asset redirect
    const externalUrl = process.env.EXTENSION_DOWNLOAD_URL || process.env.NEXT_PUBLIC_EXTENSION_DOWNLOAD_URL;
    if (externalUrl && externalUrl.startsWith("https://")) {
      return NextResponse.redirect(externalUrl, 302);
    }

    // 2. Local filesystem resolution if present (e.g. local dev / containerized environments)
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

    if (filePath) {
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
    }

    // 3. Fallback on serverless hosting (e.g. Vercel CDN): redirect to the public static file URL
    const staticUrl = new URL("/downloads/FocusFlow-Chrome-Extension.zip", request.url);
    return NextResponse.redirect(staticUrl, 302);
  } catch (err) {
    console.error("Error serving extension download:", err);
    return NextResponse.redirect(GITHUB_EXTENSION_DOWNLOAD_URL, 302);
  }
}
