import { prisma } from '@eipms/database';

export async function generateDocumentNumber(type: 'INQUIRY' | 'QUOTATION' | 'INVOICE' | 'CHALLAN' | 'PO', tx?: any): Promise<string> {
  const client = tx || prisma;
  const currentYear = new Date().getFullYear();
  const yy = String(currentYear).slice(-2); // e.g. '26'
  const yyyy = String(currentYear);

  let settingKey = '';
  let formatSettingKey = '';
  let defaultFormat = '';
  let defaultNextSeq = '1';

  switch (type) {
    case 'INQUIRY':
      settingKey = 'next_seq_inquiry';
      formatSettingKey = 'format_inquiry';
      defaultFormat = 'INQ-{{seq}}-{{yy}}';
      break;
    case 'QUOTATION':
      settingKey = 'next_seq_quotation';
      formatSettingKey = 'format_quotation';
      defaultFormat = 'QT-{{seq}}-{{yy}}';
      defaultNextSeq = '139'; // Mapped from QT-139-25-26 example
      break;
    case 'INVOICE':
      settingKey = 'next_seq_invoice';
      formatSettingKey = 'format_invoice';
      defaultFormat = 'INV-{{seq}}-{{yy}}';
      break;
    case 'CHALLAN':
      settingKey = 'next_seq_challan';
      formatSettingKey = 'format_challan';
      defaultFormat = 'DC-{{seq}}-{{yy}}';
      break;
    case 'PO':
      settingKey = 'next_seq_po';
      formatSettingKey = 'format_po';
      defaultFormat = 'PO-{{seq}}-{{yy}}';
      break;
  }

  // 1. Get or create sequence settings inside the transaction
  let seqSetting = await client.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (!seqSetting) {
    seqSetting = await client.systemSetting.create({
      data: {
        key: settingKey,
        value: defaultNextSeq,
        description: `Next sequential counter for ${type}`
      }
    });
  }

  // 2. Get or create formatting template settings
  let formatSetting = await client.systemSetting.findUnique({
    where: { key: formatSettingKey }
  });

  if (!formatSetting) {
    formatSetting = await client.systemSetting.create({
      data: {
        key: formatSettingKey,
        value: defaultFormat,
        description: `Formatting template for ${type} numbers`
      }
    });
  }

  const currentSeqVal = Number(seqSetting.value);
  const formattedSeq = String(currentSeqVal).padStart(3, '0'); // e.g. '001', '139'

  // Build the code string
  let docNumber = formatSetting.value;
  docNumber = docNumber.replace('{{seq}}', formattedSeq);
  docNumber = docNumber.replace('{{yy}}', yy);
  docNumber = docNumber.replace('{{yyyy}}', yyyy);

  // 3. Increment sequence value for the next call
  await client.systemSetting.update({
    where: { key: settingKey },
    data: { value: String(currentSeqVal + 1) }
  });

  return docNumber;
}
