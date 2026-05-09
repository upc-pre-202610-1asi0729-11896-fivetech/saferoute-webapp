import {Component, inject} from '@angular/core';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RoutesManagementStore} from '../../../application/routes-management.store';
import {Route} from '../../../domain/model/route-entity';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-route-form',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './route-form.html',
  styleUrl: './route-form.css'
})
export class RouteForm {
  private fb = inject(FormBuilder);
  private routeParam = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(RoutesManagementStore);

  form = this.fb.group({
    title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
  });

  isEdit = false;
  routeId: number | null = null;

  constructor() {
    this.routeParam.params.subscribe(params => {
      this.routeId = params['id'] ? +params['id'] : null;
      this.isEdit = !!this.routeId;
      if (this.isEdit && this.routeId) {
        let id = this.routeId;
        const routeObj = this.store.getRouteById(id)();
        if (routeObj) {
          this.form.patchValue({ title: routeObj.title, description: routeObj.description });
        }
      }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const routeObj: Route = new Route({
      id: this.routeId ?? 0,
      title: this.form.value.title!,
      description: this.form.value.description!
    });
    if (this.isEdit) {
      this.store.updateRoute(routeObj);
    } else {
      this.store.addRoute(routeObj);
    }
    this.router.navigate(['routes-management/routes']).then();
  }
}
