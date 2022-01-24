import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-page',
  templateUrl: './dialog-page.component.html',
  styleUrls: ['./dialog-page.component.scss']
})
export class DialogPageComponent implements OnInit {

    msg: string
    constructor(@Inject(MAT_DIALOG_DATA) data) {
        this.msg = data.msg
    }

  ngOnInit(): void {
  }

}
