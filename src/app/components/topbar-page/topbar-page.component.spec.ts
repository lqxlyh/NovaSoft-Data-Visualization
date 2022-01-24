import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopbarPageComponent } from './topbar-page.component';

describe('TopbarPageComponent', () => {
  let component: TopbarPageComponent;
  let fixture: ComponentFixture<TopbarPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopbarPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TopbarPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
