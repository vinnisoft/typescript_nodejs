export const camelCaseToHeading = (str: string) => {
    if (!str) return '';
    if (str === 'bod' || str === 'sox') return str.toUpperCase();

    const words = str
        .replace(/-/g, ' ') // Convert hyphens to spaces
        .split(/(?=[A-Z])|\s+/); // Split by capital letters or spaces

    // Capitalize first letter of each word
    const capitalizedWords = words.map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );

    // Join words with spaces
    return capitalizedWords.join(' ');
}

export const toCamelCase = (str: string): string => {
    if (!str) return '';

    const hyphenHandled = str.replace(/-([a-z])/g, (match, letter) => {
        return letter.toUpperCase();
    });

    const words = hyphenHandled.split(/\s+/);

    let firstWord = words[0];
    if (firstWord.length > 0) {
        firstWord = firstWord.charAt(0).toLowerCase() + firstWord.slice(1);
    }

    // For remaining words, capitalize first letter but preserve internal camelCase
    const remainingWords = words.slice(1)
        .map(word => {
            if (word.length > 0) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join('');

    return firstWord + remainingWords;
}


export const truncateHtml = (html: string, limit: number): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    let text = div.innerText || div.textContent || "";

    return text.length > limit ? text.substring(0, limit) + "..." : text;
}

export const changePrivilegesToString = (privilege: {
    read: boolean,
    manage: boolean
}) => {
    if (privilege.manage) {
        return "manage";
    } else if (privilege.read) {
        return "read"
    }
    return null;
}

export const toFormData = (data: any) => {
    let formData = new FormData();
    for (let key in data) {
        if (key === "_id") {
            delete data[key]
            continue;
        }
        if (data[key]) {
            if (Array.isArray(data[key])) {
                for (let item of data[key]) {
                    if (item instanceof File) {
                        formData.append(key, item, item.name);
                    } else {
                        formData.append(key, JSON.stringify(item));
                    }
                }
            } else {
                formData.append(key, data[key]);
            }
        }
    }
    return formData;
}

export const getFlagHtml = (countryCode: string) => {
    if (!countryCode) return '';
    // Return HTML for responsive flag image with srcset
    return `<img
        src="https://flagcdn.com/16x12/${countryCode.toLowerCase()}.png"
        srcset="https://flagcdn.com/32x24/${countryCode.toLowerCase()}.png 2x,
                https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png 3x"
        width="16"
        height="12"
        alt="${countryCode.toUpperCase()}"
        style="vertical-align: middle;">`;
}

export const getFlagEmoji = (code: string) => {
    return code.toUpperCase().replace(/./g, char =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

export const generateRandomColor = (): string => {
    const r = Math.floor(Math.random() * 151);
    const g = Math.floor(Math.random() * 151);
    const b = Math.floor(Math.random() * 151);
    const color: string = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    return color;
}

export const generateRandomColors = (count: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        const r = Math.floor(Math.random() * 151);
        const g = Math.floor(Math.random() * 151);
        const b = Math.floor(Math.random() * 151);
        const color = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        colors.push(color);
    }
    return colors;
}

// ... existing code ...

export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    // Determine the appropriate unit
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Convert to the appropriate unit with 2 decimal places
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const calculateStoragePercentage = (storageQuota: number, storageUsed: number): number => {

    if (!storageQuota || storageQuota === 0) {
        return 0;
    }

    // Calculate percentage of storage used
    const percentage = (storageUsed / storageQuota) * 100;
    // Ensure the value is between 0 and 100
    return Math.min(Math.max(percentage, 0), 100);
}

