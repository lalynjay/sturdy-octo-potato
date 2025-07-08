const schedule = require('node-schedule');
const Scraper = require('./scraper');
const Storage = require('./storage');
const Notifier = require('./notifier');

class Scheduler {
    constructor() {
        this.scraper = new Scraper();
        this.storage = new Storage();
        this.notifier = new Notifier();
        this.job = null;
    }

    start(cronExpression = '*/30 * * * *') { // Default: every 30 minutes
        this.job = schedule.scheduleJob(cronExpression, async () => {
            try {
                const data = await this.scraper.scrape();
                await this.storage.save(data);
                await this.notifier.notify(data);
            } catch (error) {
                console.error('Scheduled job error:', error);
            }
        });
    }

    stop() {
        if (this.job) {
            this.job.cancel();
            this.job = null;
        }
    }
}

module.exports = Scheduler; 