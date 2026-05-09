import {AfterViewChecked, Component, computed, inject, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {RoutesManagementStore} from '../../../application/routes-management.store';
import {MatError} from '@angular/material/form-field';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {TranslatePipe} from '@ngx-translate/core';
import {MatIcon} from '@angular/material/icon';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort, MatSortHeader} from '@angular/material/sort';

@Component({
  selector: 'app-route-list',
  imports: [MatTableModule, MatButtonModule, MatError, MatProgressSpinner, TranslatePipe, MatIcon, MatPaginator, MatSort, MatSortHeader],
  templateUrl: './route-list.html',
  styleUrl: './route-list.css'
})
export class RouteList implements AfterViewChecked {
  readonly store = inject(RoutesManagementStore);
  protected router = inject(Router);

  displayedColumns: string[] = ['id', 'title', 'description', 'actions'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = computed(() => {
    const source = new MatTableDataSource(this.store.routes());
    source.sort = this.sort;
    source.paginator = this.paginator;
    return source;
  });

  editRoute(id: number) {
    this.router.navigate(['routes-management/routes', id, 'edit']).then();
  }

  deleteRoute(id: number) {
    this.store.deleteRoute(id);
  }

  navigateToNew() {
    this.router.navigate(['routes-management/routes/new']).then();
  }

  ngAfterViewChecked() {
    if (this.dataSource().paginator !== this.paginator) {
      this.dataSource().paginator = this.paginator;
    }
    if (this.dataSource().sort !== this.sort) {
      this.dataSource().sort = this.sort;
    }
  }
}
