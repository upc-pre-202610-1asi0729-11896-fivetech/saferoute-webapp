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
  selector: 'app-stop-list',
  imports: [MatTableModule, MatButtonModule, MatError, MatProgressSpinner, TranslatePipe, MatIcon, MatPaginator, MatSort, MatSortHeader],
  templateUrl: './stop-list.html',
  styleUrl: './stop-list.css'
})
export class StopList implements AfterViewChecked {
  readonly store = inject(RoutesManagementStore);
  protected router = inject(Router);

  displayedColumns: string[] = ['id', 'location', 'time', 'route', 'actions'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = computed(() => {
    const source = new MatTableDataSource(this.store.stops());
    source.sort = this.sort;
    source.paginator = this.paginator;
    return source;
  });

  editStop(id: number) {
    this.router.navigate(['routes-management/stops', id, 'edit']).then();
  }

  deleteStop(id: number) {
    this.store.deleteStop(id);
  }

  navigateToNew() {
    this.router.navigate(['routes-management/stops/new']).then();
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
