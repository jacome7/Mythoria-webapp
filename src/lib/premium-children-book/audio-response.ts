import { getCurrentPremiumAudiobook } from './audiobook';
import { downloadPremiumPageAudio } from './storage';

export async function premiumPageAudioResponse(
  request: Request,
  story: { storyId: string; features: unknown; audiobookUri: unknown; status: string | null },
  trackIndex: number,
) {
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  const premium =
    story.status === 'published'
      ? getCurrentPremiumAudiobook(story.storyId, story.features, story.audiobookUri)
      : null;
  const runId = new URL(request.url).searchParams.get('runId');
  const track = premium?.runId === runId ? premium.tracks[trackIndex] : null;
  if (!track) return new Response(null, { status: 404, headers });

  const audio = await downloadPremiumPageAudio(track.audio);
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  const range = request.headers.get('range');
  if (!range) {
    headers.set('Content-Length', String(audio.length));
    return new Response(new Uint8Array(audio), { headers });
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const start = match?.[1] ? Number(match[1]) : Math.max(0, audio.length - Number(match?.[2]));
  const end =
    match?.[1] && match[2] ? Math.min(Number(match[2]), audio.length - 1) : audio.length - 1;
  if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
    headers.set('Content-Range', `bytes */${audio.length}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${audio.length}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(new Uint8Array(audio.subarray(start, end + 1)), { status: 206, headers });
}
