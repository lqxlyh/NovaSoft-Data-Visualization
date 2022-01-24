import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TopbarPageComponent } from './components/topbar-page/topbar-page.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material/material.module';
import { MainPageComponent } from './components/main-page/main-page.component';
import { DialogPageComponent } from './components/dialog-page/dialog-page.component';
import { AnalysisPageComponent } from './components/analysis-page/analysis-page.component';
import { NgxEchartsModule } from 'ngx-echarts';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent, TopbarPageComponent, MainPageComponent, DialogPageComponent, AnalysisPageComponent],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MaterialModule,
    NgxEchartsModule.forRoot({
        echarts: () => import('echarts')
    }),
    TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
