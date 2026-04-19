export interface LocalDateTimeParts {
    date: string;
    time: string;
}

function padToTwoDigits(value: number): string {
    return value.toString().padStart(2, '0');
}

export function isoUtcToLocalDateTimeParts(isoUtcDateTime?: string | null): LocalDateTimeParts {
    if (!isoUtcDateTime) {
        return {
            date: '',
            time: ''
        };
    }

    const date = new Date(isoUtcDateTime);
    if (Number.isNaN(date.getTime())) {
        return {
            date: '',
            time: ''
        };
    }

    return {
        date: `${date.getFullYear()}-${padToTwoDigits(date.getMonth() + 1)}-${padToTwoDigits(date.getDate())}`,
        time: `${padToTwoDigits(date.getHours())}:${padToTwoDigits(date.getMinutes())}:${padToTwoDigits(date.getSeconds())}`
    };
}

export function localDateTimePartsToIsoUtc(localDate: string, localTime: string): string | null {
    if (!localDate || !localTime) {
        return null;
    }

    const isValidDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(localDate);
    const isValidTimeFormat = /^\d{2}:\d{2}(:\d{2})?$/.test(localTime);
    if (!isValidDateFormat || !isValidTimeFormat) {
        return null;
    }

    const [year, month, day] = localDate.split('-').map(Number);
    const [hours, minutes, seconds = 0] = localTime.split(':').map(Number);

    if (
        !Number.isFinite(year)
        || !Number.isFinite(month)
        || !Number.isFinite(day)
        || !Number.isFinite(hours)
        || !Number.isFinite(minutes)
        || !Number.isFinite(seconds)
    ) {
        return null;
    }

    const localDateTime = new Date(0);
    localDateTime.setFullYear(year, month - 1, day);
    localDateTime.setHours(hours, minutes, seconds, 0);

    if (Number.isNaN(localDateTime.getTime())) {
        return null;
    }

    return localDateTime.toISOString().replace('.000Z', 'Z');
}
