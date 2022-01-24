import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-topbar-page',
  templateUrl: './topbar-page.component.html',
  styleUrls: ['./topbar-page.component.scss']
})
export class TopbarPageComponent implements OnInit {

  constructor() { }

    public isMainPageLinkDisabled: boolean = true;
    public isAnalysisPageLinkDisabled: boolean = false;

    ngOnInit(): void {
    }

    goToMainPage(): void {
        this.isMainPageLinkDisabled = true;
        this.isAnalysisPageLinkDisabled = false;
        document.getElementById("mainPageLink").style.backgroundColor = "greenyellow"
        document.getElementById("analysisPageLink").style.backgroundColor = ""

    }

    goToAnalysisPage(): void {
        this.isAnalysisPageLinkDisabled = true;
        this.isMainPageLinkDisabled = false;
        document.getElementById("analysisPageLink").style.backgroundColor = "greenyellow"
        document.getElementById("mainPageLink").style.backgroundColor = ""

    }
}
