import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { toCamelCase } from '../utils/misc';

// Bulk Upload Component
@Component({
  selector: 'bulk-data-upload',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, SkeletonModule],
  template: `
    <div class="flex flex-column gap-2 mb-3 w-full">
      <label>{{ label }}</label>
      @if (loading) {
      <div class="flex flex-column gap-3 w-full">
        <p-skeleton width="100%" height="10rem" />
      </div>
      } @else {
      <div
        class="bg-white border-2 text-center border-round-lg border-dashed border-400 p-4"
        [ngClass]="{ 'border-red-600': error }"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <img [src]="iconSrc" alt="Upload icon" class="bg-white" />
        <p>
          <span class="text-main cursor-pointer" (click)="fileInput.click()"
            >Click to Upload</span
          >
          or drag and drop
        </p>
        <small> (Max. File size: {{ maxFileSizeMB }} MB)</small>
        <input
          #fileInput
          type="file"
          id="fileUpload"
          style="display: none"
          [accept]="accept"
          [multiple]="multiple"
          (change)="onFileSelected($event)"
        />
      </div>

      @if (files.length > 0) {
      <div class="my-3">
        <label>Files added</label>
        @for (file of files; track file.name) {
        <div class="flex align-items-center gap-2 mt-2">
          <div
            class="bg-white border-round-lg flex align-items-center justify-content-between px-3 py-1 w-full"
          >
            <div class="flex align-items-center gap-3">
              <img [src]="getFileIcon()" alt="File icon" />
              <p class="">{{ file.name }}</p>
            </div>
            <small>{{ formatFileSize(file.size) }}</small>
          </div>
          <i class="pi pi-trash cursor-pointer" (click)="removeFile(file)"></i>
        </div>
        }
      </div>
      } } @if(error) {
      <small class="text-red-600">{{ error }}</small>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BulkUploadComponent),
      multi: true,
    },
  ],
})
export class BulkUploadComponent implements ControlValueAccessor {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() label: string = 'Upload';
  @Input() iconSrc: string = '/assets/icons/document-upload.svg';
  @Input() accept: string = '.csv';
  @Input() multiple: boolean = false;
  @Input() maxFileSizeMB: number = 25;
  @Input() error: string | null = null;
  @Input() loading: boolean = false;
  @Input() countries: boolean = false;

  @Output() fileChange: EventEmitter<File[]> = new EventEmitter<File[]>();
  @Output() csvDataChange: EventEmitter<any[]> = new EventEmitter<any[]>();

  files: File[] = [];
  csvData: any[] = [];
  onChange: any = () => {};
  onTouch: any = () => {};
  disabled: boolean = false;

  writeValue(files: File[]): void {
    if (files) {
      this.files = files;
      this.processCSVFiles();
    } else {
      this.files = [];
      this.csvData = [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Add this new method to process CSV files when set via writeValue
  private processCSVFiles(): void {
    for (const file of this.files) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        this.readCSVFile(file);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer && event.dataTransfer.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  handleFiles(fileList: FileList): void {
    const maxSizeBytes = this.maxFileSizeMB * 1024 * 1024;
    const newFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size <= maxSizeBytes) {
        newFiles.push(file);
        // Process CSV file
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          this.readCSVFile(file);
        }
      } else {
        console.error(
          `File ${file.name} exceeds the maximum size of ${this.maxFileSizeMB}MB`
        );
      }
    }

    if (this.multiple) {
      this.files = [...this.files, ...newFiles];
    } else {
      this.files = newFiles.length > 0 ? [newFiles[0]] : [];
    }

    this.emitChanges();
  }

  readCSVFile(file: File): void {
    const reader = new FileReader();

    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      if (csvContent) {
        this.csvData = this.csvToJSON(csvContent);
        this.csvDataChange.emit(this.csvData);
      }
    };

    reader.readAsText(file);
  }

  csvToJSON(csv: string): any[] {
    // Split the CSV content into lines
    const lines = csv.split(/\r\n|\n/);

    // Extract headers (first line)
    const headers = lines[0]
      .split(',')
      .map((header) =>
        toCamelCase(header.trim().replace(/^["'](.*)["']$/, '$1'))
      );

    const result: any[] = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines

      const obj: any = {};
      const currentLine = this.parseCSVLine(lines[i]);

      // Process each column
      for (let j = 0; j < headers.length; j++) {
        let value = currentLine[j] ? currentLine[j].trim() : '';

        // Remove quotes if present
        value = value.replace(/^["'](.*)["']$/, '$1');

        // Handle different field types
        if (headers[j] === 'yearEnd' && value) {
          // Year end date handling
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              obj[headers[j]] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            } else {
              obj[headers[j]] = value;
            }
          } catch (e) {
            obj[headers[j]] = value;
          }
        } else if (!isNaN(Number(value)) && value !== '') {
          obj[headers[j]] = Number(value);
        } else if (headers[j] === 'companyType' || headers[j] === 'status') {
          obj[headers[j]] = value.toLowerCase();
        } else if (headers[j] === 'companies') {
          if (!value) {
            obj[headers[j]] = [];
          } else if (value.includes(',')) {
            obj[headers[j]] = value.split(',').map((company) => company.trim());
          } else {
            obj[headers[j]] = [value.trim()];
          }
        } else if (headers[j] === 'shareHoldings') {
          if (!value) {
            obj[headers[j]] = [];
          } else {
            try {
              // Clean up the value
              let processedValue = value.toString().trim();

              // Remove outer quotes if present
              if (
                processedValue.startsWith('"') &&
                processedValue.endsWith('"')
              ) {
                processedValue = processedValue.substring(
                  1,
                  processedValue.length - 1
                );
              }

              // Split by commas and trim each value
              const values = processedValue.split(',').map((v) => v.trim());

              // Validate we have pairs of companyNumber and percentage
              if (values.length % 2 !== 0) {
                console.error(
                  'Invalid shareHoldings format - must have pairs of companyNumber and percentage'
                );
                obj[headers[j]] = [];
              } else {
                const shareHoldings: any[] = [];

                // Process in pairs
                for (let i = 0; i < values.length; i += 2) {
                  const companyNumber = values[i];
                  const percentageStr = values[i + 1];

                  // Convert percentage to number
                  const percentage = parseFloat(percentageStr) || 0;

                  shareHoldings.push({
                    company: companyNumber,
                    percentage: percentage,
                  });
                }

                obj[headers[j]] = shareHoldings;
              }
            } catch (e) {
              console.error('Error in shareHoldings processing:', e);
              obj[headers[j]] = [];
            }
          }
        } else if (headers[j].includes('Country') && this.countries) {
          // Country handling
          const countryName = value.trim();
          const foundCountry =
            this.countries && Array.isArray(this.countries)
              ? this.countries.find(
                  (country: any) =>
                    country.countryName.toLowerCase() ===
                    countryName.toLowerCase()
                )
              : null;

          obj[headers[j]] = foundCountry || { countryName: countryName };
        } else if (headers[j].includes('Country Code') && this.countries) {
          const countryCode = value.trim();
          const foundCountry =
            this.countries && Array.isArray(this.countries)
              ? this.countries.find(
                  (country: any) =>
                    country.countryName.toLowerCase() ===
                    countryCode.toLowerCase()
                )
              : null;

          obj[headers[j]] = foundCountry;
        } else {
          obj[headers[j]] = value;
        }
      }

      result.push(obj);
    }
    return result;
  }

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Toggle quote state, but only if not escaped
        if (i === 0 || line[i - 1] !== '\\') {
          insideQuotes = !insideQuotes;
        }
        currentValue += char; // Keep the quotes in the value
      } else if (char === ',' && !insideQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add the last value
    result.push(currentValue);

    return result;
  }

  removeFile(file: File): void {
    this.files = this.files.filter((f) => f !== file);
    // Reset the file input value so the same file can be selected again
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    // Clear CSV data if the file was a CSV
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      this.csvData = [];
      this.csvDataChange.emit(this.csvData);
    }
    this.emitChanges();
  }

  emitChanges(): void {
    this.onChange(this.files);
    this.onTouch();
    this.fileChange.emit(this.files);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(): string {
    return '/assets/icons/document-upload.svg';
  }
}
