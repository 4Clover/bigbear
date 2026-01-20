import { del } from '@vercel/blob'

export const deleteBlob = async (url: string): Promise<void> => {
  await del(url)
}
