import { stat } from 'fs/promises';

export async function getAudioCreationDate(audioPath: string): Promise<Date> {
  const stats = await stat(audioPath);
  return stats.birthtime;
}
