// Analytics.js - Focus Data Processing Functions
// Chrome Extension Compatible Version

(function (global) {
    'use strict';

    /**
     * Get the average focus score for today
     * @param {Array} history - Array of {timestamp: number, score: number (0.0-1.0)}
     * @returns {number} - Average score as percentage (0-100), or 0 if no data
     */
    function getDailyAverage(history) {
        if (!history || history.length === 0) {
            return 0;
        }

        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        // Get tomorrow's date at midnight
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowTimestamp = tomorrow.getTime();

        // Filter for today's data
        const todayData = history.filter(item => {
            return item.timestamp >= todayTimestamp && item.timestamp < tomorrowTimestamp;
        });

        if (todayData.length === 0) {
            return 0;
        }

        // Calculate average score
        const sum = todayData.reduce((acc, item) => acc + item.score, 0);
        const average = sum / todayData.length;

        // Convert to percentage (0-100)
        return Math.round(average * 100);
    }

    /**
     * Get current focus status based on recent data points
     * @param {Array} history - Array of {timestamp: number, score: number (0.0-1.0)}
     * @returns {string} - Status: 'Flow State 🟢', 'Neutral 🟡', or 'Distracted 🔴'
     */
    function getCurrentStatus(history) {
        if (!history || history.length === 0) {
            return 'Neutral 🟡';
        }

        // Get the last 5 data points
        const recentData = history.slice(-5);

        // Calculate average of recent data
        const sum = recentData.reduce((acc, item) => acc + item.score, 0);
        const average = sum / recentData.length;

        // Determine status
        if (average > 0.7) {
            return 'Flow State 🟢';
        } else if (average < 0.4) {
            return 'Distracted 🔴';
        } else {
            return 'Neutral 🟡';
        }
    }

    /**
     * Get focus data grouped by day for the last 7 days (for Chart.js)
     * @param {Array} history - Array of {timestamp: number, score: number (0.0-1.0)}
     * @returns {Object} - {labels: ['Mon', 'Tue', ...], data: [75, 80, ...]}
     */
    function getLast7DaysData(history) {
        if (!history || history.length === 0) {
            return {
                labels: [],
                data: []
            };
        }

        // Get timestamps for the last 7 days
        const now = new Date();
        const daysData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const startOfDay = date.getTime();
            const endOfDay = startOfDay + (24 * 60 * 60 * 1000); // Add 24 hours

            // Get day name
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            // Filter data for this day
            const dayHistory = history.filter(item => {
                return item.timestamp >= startOfDay && item.timestamp < endOfDay;
            });

            // Calculate average for this day
            let dayAverage = 0;
            if (dayHistory.length > 0) {
                const sum = dayHistory.reduce((acc, item) => acc + item.score, 0);
                dayAverage = Math.round((sum / dayHistory.length) * 100);
            }

            daysData.push({
                label: dayName,
                average: dayAverage
            });
        }

        // Extract labels and data arrays
        const labels = daysData.map(day => day.label);
        const data = daysData.map(day => day.average);

        return {
            labels,
            data
        };
    }

    // Export for different module systems
    const analytics = {
        getDailyAverage,
        getCurrentStatus,
        getLast7DaysData
    };

    // UMD pattern for Chrome extensions
    if (typeof module !== 'undefined' && module.exports) {
        // CommonJS
        module.exports = analytics;
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(function () { return analytics; });
    } else {
        // Browser global
        global.Analytics = analytics;
    }

})(typeof self !== 'undefined' ? self : this);
