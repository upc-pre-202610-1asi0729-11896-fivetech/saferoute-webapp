import {Component, inject} from '@angular/core';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RoutesManagementStore} from '../../../application/routes-management.store';
import {Stop} from '../../../domain/model/stop-entity';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-stop-form',
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './stop-form.html',
  styleUrl: './stop-form.css'
})
export class StopForm {
  private fb = inject(FormBuilder);
  private routeParam = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(RoutesManagementStore);

  form = this.fb.group({
    location: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    time: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    routeId: new FormControl<number | null>(null, { validators: [Validators.required] })
  });

  routes = this.store.routes;

  isEdit = false;
  stopId: number | null = null;

  constructor() {
    this.routeParam.params.subscribe(params => {
      this.stopId = params['id'] ? +params['id'] : null;
      this.isEdit = !!this.stopId;
      if (this.isEdit && this.stopId) {
        let id = this.stopId;
        const stopObj = this.store.getStopById(id)();
        if (stopObj) {
          this.form.patchValue({ location: stopObj.location, time: stopObj.time, routeId: stopObj.routeId });
        }
      }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const stopObj: Stop = new Stop({
      id: this.stopId ?? 0,
      location: this.form.value.location!,
      time: this.form.value.time!,
      routeId: this.form.value.routeId ?? 0
    });
    if (this.isEdit) {
      this.store.updateStop(stopObj);
    } else {
      this.store.addStop(stopObj);
    }
    this.router.navigate(['routes-management/stops']).then();
  }
}
