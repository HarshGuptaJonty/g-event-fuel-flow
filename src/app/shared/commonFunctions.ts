import { NotificationService } from "../services/notification.service";

export function timeAgoWithMsg(past: number, present: number = Date.now()) {
  let text = timeAgo(past, present);
  if (text !== 'just now')
    text += ' ago';
  return text;
}

export function timeAgo(past: number, present: number = Date.now()) {
  const diff = Math.floor((present - past) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) > 1 ? 's' : ''}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''}`;
  if (diff < 2419200) return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) > 1 ? 's' : ''}`;
  if (diff < 29030400) return `${Math.floor(diff / 2419200)} month${Math.floor(diff / 2419200) > 1 ? 's' : ''}`;
  return `${Math.floor(diff / 29030400)} year${Math.floor(diff / 29030400) > 1 ? 's' : ''}`;
}

export function getNumberInformat(number: string) {
  if (number && number.length == 10)
    return number.slice(0, 5) + '-' + number.slice(5);
  return number;
}

export function copyData(data: string, notificationService: NotificationService) {
  navigator.clipboard.writeText(data).then(() => {

    notificationService.showNotification({
      heading: 'Copied to clipboard.',
      duration: 5000,
      leftBarColor: '#3A7D44'
    });

  }).catch(() => {
    notificationService.showNotification({
      heading: 'Something Went Wrong!',
      message: 'Please Contact IT Support!',
      duration: 5000,
      leftBarColor: '#ff0000'
    });
  })
}

export function generateRandomString(length = 14) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function dateConverter(inputDate: string): string { // convert 'dd/MM/yyyy' to 'dd MMMM yyyy'
  const [day, month, year] = inputDate.split('/');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

export function getDateInDatepickerFormat(shiftDays = 0) { // ddMMyyyy
  const today = new Date();

  if (shiftDays !== 0)
    today.setDate(today.getDate() + shiftDays); // Shift the date by the specified number of days

  let day: any = today.getDate();
  let month: any = today.getMonth() + 1;
  const year = today.getFullYear();

  day = day < 10 ? '0' + day : day;
  month = month < 10 ? '0' + month : month;
  return `${day}${month}${year}`;
}

export function generateDateTimeKey(): string { // HHmmss
  const today = new Date();
  let hour: any = today.getHours();
  let min: any = today.getMinutes();
  let sec: any = today.getSeconds();

  sec = sec < 10 ? '0' + sec : sec;
  min = min < 10 ? '0' + min : min;
  hour = hour < 10 ? '0' + hour : hour;
  return `${hour}${min}${sec}`;
}

export function formatDateAndTime(timestamp?: number) {
  if (!timestamp)
    return null;

  const date = new Date(timestamp);

  const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return `${formattedDate} at ${formattedTime}`;
}