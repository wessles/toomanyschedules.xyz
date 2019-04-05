/*
Too Many Schedules
 Copyright (C) 2019 Wes LaFerriere <wesley.laferriere@gmail.com>

 Everyone is permitted to copy and distribute verbatim or modified
 copies of this license document, and changing it is allowed as long
 as the name is changed.

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

  0. You just DO WHAT THE FUCK YOU WANT TO.
*/

URL = "http://stevens-scheduler.cfapps.io/p/";

class Scheduler {

    constructor() {
        this.desired_classes = [];
        this.term = '';
        this.catalog = [];
        this.section_dict = {};
        this.all_schedules = [];

    	this.last_catalog_term = '';
    }

    set_desired_classes(desired_classes) {
        this.desired_classes = desired_classes;
    }

    set_term(term){
        this.term = term;
    }

    get_possible_schedule_count(){
        return this.all_schedules.length;
    }

    any_missing() {
        for (let search of this.desired_classes) {
            if (!(search in this.section_dict)) {
                return search;
            }
        }
        return null;
    }

    reload_catalog(success_callback, fail_callback) {
    	let me = this;
		var req = $.getJSON(URL+this.term)
		.done(function(data) {
			me.catalog = data;
			success_callback();
		})
		.fail(function(data) {
			fail_callback();
		});
    }

    load_catalog(){
        if (this.catalog == null || this.last_catalog_term != this.term) {
            this.last_catalog_term = this.term;
            this.reload_catalog();
        }
    }

    add_sections(){
        this.section_dict = {};
        for (let section of this.catalog){
            this.add_section(this.section_dict, section);
        }
	}

    add_section(section_dict, child) {
        /*
        Given a section ("child") of JSON course catalog,
        adds all meeting times to section dictionary ("section_dict").
        */

        // acquire data about section
        let section_name = child['section'];
        let instructor = child['instructor'];
        
        // See if a regex in this.desired_classes matches our section name
        var match = null;
        for (let section_search of this.desired_classes){
            if(new RegExp(section_search).test(section_name)){
                match = section_search;
                break;
            }
        }
        if (!match)
            return;


        // if it's empty...
        let seats_left = parseInt(child['maxEnrollment']) - parseInt(child['currentEnrollment']);
        if(seats_left == 0) {
            print_status(section_name+': no seats left!');
            return;
        }


        // get list of meetings
        // this list will contain objects containing stuff like "MWF 8:30-9:30"
        let meetings = child['daysTimeLocation'];

        // here, we separate the "MWF 8:30-9:30" stuff into seperate "M 8:30-9:30", "W 8:30-9:30", etc.
        // this way we can see if anything overlaps later on
        let meeting_objs = []
        for(let meeting of meetings){
            let days = meeting['day'];
            for (let day of days){
                if (!('startTime' in meeting && 'endTime' in meeting)) // missing data, corrupt entry
                    continue
                let start = meeting['startTime']
                let end = meeting['endTime']
                meeting_objs.push({'day': day, 'start': start, 'end': end})
            }
		}
        var section_regex = match;  // this will be the key used in section_dict

        // all the meetings will be stored in a list at section_dict["^my section regex.$"]
        if (! (section_regex  in section_dict))
            section_dict[section_regex] = [];

        // add the meeting objects to the regex's list
        section_dict[section_regex].push({
            'section': section_name,
            'callnum': child['callNumber'],
            'instructor': instructor,
            'meetings': meeting_objs,
            'seats': seats_left
        });
    }

    check_possible_schedule(schedule) {
        /*
        Checks whether a potential schedule (list of meeting times) is possible.
        */

        for(let a of schedule){
            for (let b of schedule) {
                if (a == b)
                    continue;
	            for(let m_a of a['meetings']){  // for each meeting in arbitrary A
                    for (let m_b of b['meetings']){  // for each meeting in arbitrary B =/= A
                        if (m_a == m_b)
                            continue;

                        // if it's not even the same day there's no conflict
                        if (m_a['day'] != m_b['day'])
                            continue;

                        if(check_overlap(m_a, m_b))
                        	return false;
                    }
                }
            }
        }

        // no conflict found, possible schedule
        return true;
    }

    create_possible_schedule_tree() {
        /*
        Tree of possible schedules (list of meetings).

        I'm not proud of this code, but it works ¯\_(ツ)_/¯
        I'm not paid enough to fix this shit.
        */

        this.all_schedules = []
        let check_possible_schedule = this.check_possible_schedule;
        let me = this;

        function create_possible_schedule_tree_helper(remaining_sections, current_schedule){

            // if all sections have been placed, we have a final potential schedule to add to the list.
            if (remaining_sections.length == 0){
                me.all_schedules.push(current_schedule.slice());
                return;
            }

            // process first section (recursive approach)
            let section = remaining_sections[0];

            // create a list of possible sub-schedules:
            for (let meeting of section) {

                // add current schedule
                current_schedule.push(meeting);

                // check possibility
                if(check_possible_schedule(current_schedule))
                    // if possible, continue down tree to find all sub-possibilities
                    create_possible_schedule_tree_helper(remaining_sections.slice(1), current_schedule);

                current_schedule.pop();
            }
        }

        create_possible_schedule_tree_helper(Object.values(this.section_dict), new Array());
    }
}

function time2sec(time_string) {
    /*
    Convert H:M:S string into total seconds.

    (this function is memo-ized by time2sec_memo)

    This comes in handy when determining if two meeting times overlap, because we can use a simple integer, instead of a
    convoluted time string. Same goes for sec2time()
    */
    var a = time_string.split(':'); // split it at the colons
	// minutes are worth 60 seconds. Hours are worth 60 minutes.
	var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
	return seconds;
}

function sec2time(time_seconds) {
    /*
    Convert total seconds into H:M:S string.

    (this function is memo-ized by sec2time_memo)

    For usefulness, see time2sec() documentation.
    */

    return new Date(time_seconds * 1000).toISOString().substr(11, 8);
}

function check_overlap(A,B) {
	let a_s = time2sec(A['start'].substr(0, A['start'].length-1));
    let a_e = time2sec(A['end'].substr(0, A['end'].length-1));
    let b_s = time2sec(B['start'].substr(0, B['start'].length-1));
    let b_e = time2sec(B['end'].substr(0, B['end'].length-1));

    // if the times overlap, and are on the same day, there is a conflict
    if ((a_e >= b_s) && (a_s <= b_e))
        return true;

    return false;
}