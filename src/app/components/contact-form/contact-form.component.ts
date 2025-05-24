import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TextFieldModule } from '@angular/cdk/text-field'; 
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TextFieldModule
  ],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css']
})
export class ContactFormComponent implements OnInit {
  contactForm!: FormGroup;
  loading = false;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private contactService: ContactService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ContactFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = data.mode === 'edit';
    console.log('ContactFormComponent initialized with data:', data); 
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.contactForm = this.formBuilder.group({
      name: [
        this.data.contact?.name || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z\s]+$/)
        ]
      ],
      phone: [
        this.data.contact?.phone || '',
        [
          Validators.required,
          Validators.pattern(/^[\+]?[\d\s\-$$$$]+$/),
          Validators.minLength(10),
          Validators.maxLength(15)
        ]
      ],
      address: [
        this.data.contact?.address || '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(200)
        ]
      ],
      notes: [
        this.data.contact?.notes || '',
        [Validators.maxLength(500)]
      ]
    });

    console.log('Form initialized with values:', this.contactForm.value);
  }

  get f() { return this.contactForm.controls; }

  onSubmit(): void {
    console.log('Form submitted, valid:', this.contactForm.valid); 
    
    if (this.contactForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const contactData = this.contactForm.value;
    console.log('Submitting contact data:', contactData); 

    if (this.isEditMode) {
      this.updateContact(contactData);
    } else {
      this.createContact(contactData);
    }
  }

  createContact(contactData: any): void {
    console.log('Creating new contact...'); // Debug log
    this.contactService.addContact(contactData).subscribe({
      next: (response) => {
        console.log('Contact created successfully:', response); // Debug log
        this.loading = false;
        this.snackBar.open('Contact added successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error creating contact:', error); // Debug log
        this.loading = false;
        this.handleError(error);
      }
    });
  }

  updateContact(contactData: any): void {
    console.log('Updating contact with ID:', this.data.contact._id); // Debug log
    this.contactService.updateContact(this.data.contact._id, contactData).subscribe({
      next: (response) => {
        console.log('Contact updated successfully:', response); // Debug log
        this.loading = false;
        this.snackBar.open('Contact updated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error updating contact:', error); // Debug log
        this.loading = false;
        this.handleError(error);
      }
    });
  }

  handleError(error: any): void {
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.errors) {
      const errors = Object.values(error.error.errors);
      errorMessage = errors.join(', ');
    }

    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  markFormGroupTouched(): void {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.contactForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (control.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldDisplayName(fieldName)} cannot exceed ${control.errors['maxlength'].requiredLength} characters`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'name') {
          return 'Name can only contain letters and spaces';
        }
        if (fieldName === 'phone') {
          return 'Please enter a valid phone number';
        }
      }
    }
    return '';
  }

  getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      name: 'Name',
      phone: 'Phone',
      address: 'Address',
      notes: 'Notes'
    };
    return displayNames[fieldName] || fieldName;
  }
}