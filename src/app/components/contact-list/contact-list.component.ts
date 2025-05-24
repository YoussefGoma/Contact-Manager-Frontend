import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { ContactService } from '../../services/contact.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ContactFormComponent } from '../contact-form/contact-form.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface Contact {
  _id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  lockedBy?: string;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.css']
})
export class ContactListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['name', 'phone', 'address', 'notes', 'actions'];
  dataSource = new MatTableDataSource<Contact>([]);
  
  loading = false;
  currentPage = 1;
  totalContacts = 0;
  pageSize = 5;
  currentUser: string = '';

  nameFilter = new FormControl('');
  phoneFilter = new FormControl('');
  addressFilter = new FormControl('');

  private subscriptions: Subscription[] = [];
  private editingContact: Contact | null = null;

  constructor(
    private contactService: ContactService,
    private authService: AuthService,
    private socketService: SocketService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.currentUser = this.authService.currentUserValue?.username || '';
  }

  ngOnInit(): void {
    this.loadContacts();
    this.setupFilters();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.socketService.disconnect();
  }

  setupFilters(): void {
    this.subscriptions.push(
      this.nameFilter.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => this.applyFilters())
    );

    this.subscriptions.push(
      this.phoneFilter.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => this.applyFilters())
    );

    this.subscriptions.push(
      this.addressFilter.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => this.applyFilters())
    );
  }

  setupSocketListeners(): void {
    this.subscriptions.push(
      this.socketService.listen('contactAdded').subscribe((contact: Contact) => {
        this.loadContacts();
        this.snackBar.open('New contact added', 'Close', { duration: 3000 });
      })
    );

    this.subscriptions.push(
      this.socketService.listen('contactUpdated').subscribe((contact: Contact) => {
        this.loadContacts();
        this.snackBar.open('Contact updated', 'Close', { duration: 3000 });
      })
    );

    this.subscriptions.push(
      this.socketService.listen('contactDeleted').subscribe((data: any) => {
        this.loadContacts();
        this.snackBar.open('Contact deleted', 'Close', { duration: 3000 });
      })
    );

    this.subscriptions.push(
      this.socketService.listen('contactLocked').subscribe((data: any) => {
        const contact = this.dataSource.data.find(c => c._id === data.contactId);
        if (contact) {
          contact.lockedBy = data.lockedBy;
          this.dataSource.data = [...this.dataSource.data];
        }
      })
    );

    this.subscriptions.push(
      this.socketService.listen('contactUnlocked').subscribe((data: any) => {
        const contact = this.dataSource.data.find(c => c._id === data.contactId);
        if (contact) {
          contact.lockedBy = undefined;
          this.dataSource.data = [...this.dataSource.data];
        }
      })
    );
  }

  loadContacts(): void {
    this.loading = true;
    const filters = this.getFilters();

    this.contactService.getContacts(this.currentPage, filters).subscribe({
      next: (response) => {
        this.dataSource.data = response.contacts;
        this.totalContacts = response.pagination.totalContacts;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Error loading contacts', 'Close', { duration: 5000 });
        console.error('Error loading contacts:', error);
      }
    });
  }

  getFilters(): any {
    return {
      name: this.nameFilter.value || '',
      phone: this.phoneFilter.value || '',
      address: this.addressFilter.value || ''
    };
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadContacts();
  }

  clearFilters(): void {
    this.nameFilter.setValue('');
    this.phoneFilter.setValue('');
    this.addressFilter.setValue('');
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.loadContacts();
  }

  openAddDialog(): void {
    console.log('Opening add dialog...'); // Debug log
    const dialogRef = this.dialog.open(ContactFormComponent, {
      width: '500px',
      data: { contact: null, mode: 'add' },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Add dialog closed with result:', result); // Debug log
      if (result) {
        this.loadContacts();
      }
    });
  }

  editContact(contact: Contact): void {
    console.log('Edit button clicked for contact:', contact); // Debug log
    const lockAge = Date.now() - new Date(contact.lockedAt || 0).getTime();
    
    if (contact.lockedBy && contact.lockedBy !== this.currentUser && lockAge < 300000) {
      this.snackBar.open(
        `Contact is being edited by ${contact.lockedBy}`,
        'Close',
        { duration: 5000 }
      );
      return;
    }

    console.log('Attempting to lock contact...'); 
    this.contactService.lockContact(contact._id).subscribe({
      next: () => {
        console.log('Contact locked successfully, opening edit dialog...'); 
        this.editingContact = contact;
        
        const dialogRef = this.dialog.open(ContactFormComponent, {
          width: '500px',
          data: { 
            contact: { ...contact }, 
            mode: 'edit' 
          },
          disableClose: true
        });

        console.log('Edit dialog opened with data:', { contact: { ...contact }, mode: 'edit' }); 

        dialogRef.afterClosed().subscribe(result => {
          console.log('Edit dialog closed with result:', result); 
          
          if (this.editingContact) {
            this.contactService.unlockContact(this.editingContact._id).subscribe({
              next: () => console.log('Contact unlocked successfully'),
              error: (error) => console.error('Error unlocking contact:', error)
            });
            this.editingContact = null;
          }
          
          if (result) {
            this.loadContacts();
          }
        });
      },
      error: (error) => {
        console.error('Error locking contact:', error);
        this.snackBar.open(
          error.error?.message || 'Cannot edit contact',
          'Close',
          { duration: 5000 }
        );
      }
    });
  }

  deleteContact(contact: Contact): void {
    console.log('Delete button clicked for contact:', contact); 
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Contact',
        message: `Are you sure you want to delete "${contact.name}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Delete dialog closed with result:', result);
      if (result) {
        this.contactService.deleteContact(contact._id).subscribe({
          next: () => {
            this.loadContacts();
            this.snackBar.open('Contact deleted successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting contact:', error);
            this.snackBar.open('Error deleting contact', 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  isContactLocked(contact: Contact): boolean {
    return !!contact.lockedBy;
  }

  isContactLockedByOther(contact: Contact): boolean {
    const lockAge = Date.now() - new Date(contact.lockedAt || 0).getTime();
    console.log(`Lock age for contact ${contact._id}: ${ lockAge/1000 } s`);
    console.log( contact.lockedBy !== null && contact.lockedBy !== this.currentUser && lockAge < 300000)
    return contact.lockedBy !== null && contact.lockedBy !== this.currentUser && lockAge < 300000;
  }

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }
}