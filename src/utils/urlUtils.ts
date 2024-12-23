export const extractDomain = (url: string): string => {
    try {
        // Check if it's an IP address with optional port
        const ipRegex = /^(https?:\/\/)?((\d{1,3}\.){3}\d{1,3})(:\d+)?$/;
        if (ipRegex.test(url)) {
            return url.replace(/^https?:\/\//, '').split(':')[0];
        }
        
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch {
        return '';
    }
};

export const getClearbitLogoUrl = (url: string): string => {
    const domain = extractDomain(url);
    // Don't try to get logo for IP addresses
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
        return '';
    }
    return domain ? `https://logo.clearbit.com/${domain}` : '';
};

export const formatUrl = (url: string): string => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `http://${url}`;
    }
    return url;
};
