import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AnalysisPageComponent } from './components/analysis-page/analysis-page.component';
import { MainPageComponent } from './components/main-page/main-page.component'

const routes: Routes = [
    {path: '', component: MainPageComponent},
    {path:'main-page', component: MainPageComponent},
    {path: 'analysis-page', component: AnalysisPageComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
