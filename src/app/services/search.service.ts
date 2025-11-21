import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private searchtextSource = new BehaviorSubject<string>('');
  searchText$ = this.searchtextSource.asObservable();

  updateSearchText(text: string) {
    this.searchtextSource.next(text);
  }
}
