import { spawn } from "node:child_process";

type FfmpegOptions = {
  ffmpegPath?: string;
  workingDirectory?: string;
};

export function resolveFfmpegPath(explicitPath?: string) {
  return explicitPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
}

export function resolveFfprobePath(explicitPath?: string) {
  return explicitPath ?? process.env.FFPROBE_PATH ?? "ffprobe";
}

export function createMp3TranscodeArgs(inputPath: string, outputPath: string) {
  return ["-y", "-i", inputPath, "-codec:a", "libmp3lame", "-q:a", "2", outputPath];
}

export function createLoudnessNormalizeArgs(
  inputPath: string,
  outputPath: string,
) {
  return [
    "-y",
    "-i",
    inputPath,
    "-af",
    "loudnorm=I=-16:LRA=11:TP=-1.5",
    outputPath,
  ];
}

export async function runFfmpeg(
  args: string[],
  options: FfmpegOptions = {},
): Promise<{ code: number; stderr: string; stdout: string }> {
  const ffmpegPath = resolveFfmpegPath(options.ffmpegPath);

  return await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      cwd: options.workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stderr,
        stdout,
      });
    });
  });
}
