import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoaderService {
    private loadingSubject = new BehaviorSubject<boolean>(false);
    private loadingTextSubject = new BehaviorSubject<string>('');

    get isLoading$(): Observable<boolean> {
        return this.loadingSubject.asObservable();
    }

    get loadingText$(): Observable<string> {
        return this.loadingTextSubject.asObservable();
    }

    setLoaderText(text: string): void {
        this.loadingTextSubject.next(text);
    }

    showWithLoadingText(text: string, autoHide = false, time = 8000): void {
        this.loadingTextSubject.next(text);
        this.show(autoHide, time);
    }

    show(autoHide = false, time = 8000): void {
        this.loadingSubject.next(true);
        if (autoHide)
            setTimeout(() => this.hide(), time);
    }

    hide(): void {
        this.loadingSubject.next(false);
        this.loadingTextSubject.next('');
    }
}