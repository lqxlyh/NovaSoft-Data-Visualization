import { NgModule } from '@angular/core';

import { MatCardModule } from '@angular/material/card'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon';
import {MatRadioModule} from '@angular/material/radio';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSelectModule} from '@angular/material/select';
import {MatTableModule} from '@angular/material/table';
import {FormsModule} from '@angular/forms';

const modules = [
  MatCardModule,
  MatInputModule,
  MatButtonModule,
  MatToolbarModule,
  MatIconModule,
  MatRadioModule,
  MatCheckboxModule,
  MatDialogModule,
  MatSelectModule,
  MatTableModule,
  FormsModule
]

@NgModule({
  declarations: [],
  imports: modules,
  exports: modules,
})

export class MaterialModule { }