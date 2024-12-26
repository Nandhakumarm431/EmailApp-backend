
class Utils {
    static validateMobileNum(contactNo) {
        const regex = /^\d{10}$/;
        return regex.test(contactNo)
    }

    static convertDate(dateformat) {
        const baseDate = new Date(1900, 0, 1);
        const excelBaseDate = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000)
        const date = new Date(excelBaseDate.getTime() + dateformat * 24 * 60 * 60 * 1000)
        return date.toISOString().split('T')[0]
    }

    static convertTime(timeformat) {
        const dateStartTime = parseFloat(timeformat)
        const totalSecs = Math.floor(dateStartTime * 24 * 60 * 60);
        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        const time = [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(seconds).padStart(2, '0')
        ].join(':');

        return time;

    }

    static createTimeSlots(startTime, endTime) {
        const slots = [];
        let current = new Date(`1970-01-01T${startTime}:00`);
        const end = new Date(`1970-01-01T${endTime}:00`);

        while (current <= end) {
            let hours = current.getHours();
            let minutes = current.getMinutes();
            let timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            slots.push(timeString)

            current.setMinutes(current.getMinutes() + 30);
        }
        return slots;
    }

    static isValidDate(date) {
        return !isNaN(Date.parse(date))
    }
    static preprocessZipcode(zipcode) {
        if (!/^\d+$/.test(zipcode)) {
            return null; // Invalid input
        }
        return parseInt(zipcode, 10);
    }
    static preprocessInteger(input) {
        if (input === '' || isNaN(Number(input))) {
            return null
        }
        return parseInt(input, 10)
    }
}


module.exports = Utils