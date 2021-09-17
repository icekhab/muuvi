const ua = require('universal-analytics');

const visitor = ua('UA-149566326-1');

class Analytics {
    constructor(userId) {
        this.userId = userId
    }

    start() {
        this.sendEvent('start');
    }

    menu() {
        this.sendEvent('menu');
    }

    help() {
        this.sendEvent('help');
    }

    editByTheTime() {
        this.sendEvent('edit_by_the_time_option');
    }

    editByTheTimeAndSize() {
        this.sendEvent('edit_by_the_time_and_size_option');
    }

    enteredYoutubeLink() {
        this.sendEvent('youtube_link_entered');
    }

    enteredStartTime() {
        this.sendEvent('start_time_entered');
    }

    enteredDuration() {
        this.sendEvent('duration_entered');
    }

    enteredCutPointTop() {
        this.sendEvent('cut_point_top_entered');
    }

    enteredCutPointRight() {
        this.sendEvent('cut_point_right_entered');
    }

    enteredCutPointBottom() {
        this.sendEvent('cut_point_bottom_entered');
    }

    enteredCutPointLeft() {
        this.sendEvent('cut_point_left_entered');
    }

    finish() {
        this.sendEvent('finish');
    }

    menuAfterFinish() {
        this.sendEvent('menu_after_finish');
    }

    editAfterFinish() {
        this.sendEvent('edit_after_finish');
    }

    editTimeAfterFinish() {
        this.sendEvent('edit_time_after_finish');
    }

    editTrimAfterFinish() {
        this.sendEvent('edit_trim_after_finish');
    }

    editStartTimeAfterFinish() {
        this.sendEvent('edit_start_time_after_finish');
    }

    editEndTimeAfterFinish() {
        this.sendEvent('edit_end_time_after_finish');
    }

    moveTimeToRightAfterFinish() {
        this.sendEvent('move_time_right_after_finish');
    }

    moveTimeToLeftAfterFinish() {
        this.sendEvent('move_time_left_after_finish');
    }

    enteredMoveTimeToRightAfterFinish() {
        this.sendEvent('move_time_right_after_finish_entered');
    }

    enteredMoveTimeToLeftAfterFinish() {
        this.sendEvent('move_time_left_after_finish_entered');
    }

    enteredCutPointTopAfterFinish() {
        this.sendEvent('cut_point_top_after_finish_entered');
    }

    enteredCutPointRightAfterFinish() {
        this.sendEvent('cut_point_right_after_finish_entered');
    }

    enteredCutPointBottomAfterFinish() {
        this.sendEvent('cut_point_bottom_after_finish_entered');
    }

    enteredCutPointLeftAfterFinish() {
        this.sendEvent('cut_point_left_after_finish_entered');
    }

    sendEvent(eventName) {
        const params = {
            ec: 'Telegram bot',
            ea: eventName,
            uid: this.userId,
        };
        visitor.event(params).send();
    }
}

module.exports = Analytics;