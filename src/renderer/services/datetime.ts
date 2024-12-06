export function formatDateTime(date: string | Date) {
    const utcDate = new Date(date);
    const localDate = new Date(utcDate);
    console.log(`Converting ${date} to local time ${localDate}`);
    return `${localDate.toLocaleDateString("en-CA")} ${
        localDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
    }`;
}
