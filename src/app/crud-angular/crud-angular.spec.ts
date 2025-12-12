import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrudAngular } from './crud-angular';

describe('CrudAngular', () => {
  let component: CrudAngular;
  let fixture: ComponentFixture<CrudAngular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CrudAngular]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrudAngular);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
