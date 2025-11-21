import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ConfirmationModelService } from '../../services/confirmation-model.service';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-confirmation-model',
  imports: [
    CommonModule,
    MatButtonModule,
    MatChipsModule
  ],
  templateUrl: './confirmation-model.component.html',
  styleUrl: './confirmation-model.component.scss'
})
export class ConfirmationModelComponent {

  constructor(
    public confirmationModelService: ConfirmationModelService
  ) { }

  onButtonClick(button: string, id?: string) {
    this.confirmationModelService.triggerAction(id, button);
  }
}
