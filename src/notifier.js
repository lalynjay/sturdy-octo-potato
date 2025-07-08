class Notifier {
    constructor() {
        this.notificationChannels = [];
    }

    addChannel(channel) {
        this.notificationChannels.push(channel);
    }

    async notify(data) {
        for (const channel of this.notificationChannels) {
            try {
                await channel.send(data);
            } catch (error) {
                console.error(`Notification error for channel ${channel.name}:`, error);
            }
        }
    }

    // Example notification method
    async sendEmail(data) {
        // Implement email notification logic
        console.log('Sending email notification:', data);
    }

    // Example notification method
    async sendSlack(data) {
        // Implement Slack notification logic
        console.log('Sending Slack notification:', data);
    }
}

module.exports = Notifier; 