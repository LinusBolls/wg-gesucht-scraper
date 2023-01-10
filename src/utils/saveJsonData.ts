import { promises } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(__dirname, '../output');

export default async function saveJsonData(fileName: string, data: any) {
  const filePath = join(OUTPUT_DIR, fileName);

  const dataStr = JSON.stringify(data, null, 2);

  await promises.writeFile(filePath, dataStr, { flag: 'wx' });
}
