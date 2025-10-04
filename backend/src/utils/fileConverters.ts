import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs/promises';

export interface ExcelConversionOptions {
  sheetName?: string;
  sheetIndex?: number;
}

export interface ConversionResult {
  markdown: string;
  metadata?: {
    sheets?: string[];
    [key: string]: any;
  };
}

/**
 * Convert Word document (.docx) to Markdown
 */
export async function convertWordToMarkdown(filePath: string): Promise<ConversionResult> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });

    return {
      markdown: result.value,
      metadata: {
        messages: result.messages
      }
    };
  } catch (error) {
    throw new Error(`Failed to convert Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert Excel file (.xlsx, .xls) to Markdown
 */
export async function convertExcelToMarkdown(
  filePath: string,
  options?: ExcelConversionOptions
): Promise<ConversionResult> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetNames = workbook.SheetNames;

    // If no sheet specified, return list of sheets for user to choose
    if (!options?.sheetName && options?.sheetIndex === undefined) {
      return {
        markdown: '',
        metadata: {
          sheets: sheetNames,
          requiresSheetSelection: true
        }
      };
    }

    // Get the specified sheet
    let sheetName: string;
    if (options.sheetName) {
      sheetName = options.sheetName;
    } else if (options.sheetIndex !== undefined) {
      sheetName = sheetNames[options.sheetIndex];
    } else {
      sheetName = sheetNames[0]; // Default to first sheet
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to CSV first
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Convert CSV to Markdown table
    const markdown = csvToMarkdownTable(csv);

    return {
      markdown: `# ${sheetName}\n\n${markdown}`,
      metadata: {
        sheets: sheetNames,
        selectedSheet: sheetName
      }
    };
  } catch (error) {
    throw new Error(`Failed to convert Excel document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert CSV file to Markdown table
 */
export async function convertCsvToMarkdown(filePath: string): Promise<ConversionResult> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const markdown = csvToMarkdownTable(fileContent);

    return {
      markdown
    };
  } catch (error) {
    throw new Error(`Failed to convert CSV document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to convert CSV string to Markdown table
 */
function csvToMarkdownTable(csv: string): string {
  const parseResult = Papa.parse(csv, {
    skipEmptyLines: true,
    header: false
  });

  const rows = parseResult.data as string[][];

  if (rows.length === 0) {
    return 'Empty table';
  }

  let markdown = '';

  // Header row
  const headers = rows[0];
  markdown += '| ' + headers.join(' | ') + ' |\n';

  // Separator
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Ensure row has same number of columns as header
    while (row.length < headers.length) {
      row.push('');
    }
    markdown += '| ' + row.slice(0, headers.length).join(' | ') + ' |\n';
  }

  return markdown;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

/**
 * Determine file type and convert appropriately
 */
export async function convertFileToMarkdown(
  filePath: string,
  filename: string,
  options?: ExcelConversionOptions
): Promise<ConversionResult> {
  const extension = getFileExtension(filename);

  switch (extension) {
    case '.docx':
      return await convertWordToMarkdown(filePath);

    case '.xlsx':
    case '.xls':
      return await convertExcelToMarkdown(filePath, options);

    case '.csv':
      return await convertCsvToMarkdown(filePath);

    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
