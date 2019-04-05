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


// this is the default text in the class list input
// it can be reset to this text by pressing "reset" next to "class-list"
const defaultclasses = `# this is a comment, it's for reading only

# this program uses *regex* to match section names
# if you don't know regex, it's easier than it looks
# click on "need help?" at the top of the page

# mathematics
MA 232.$            # linear algebra

# computer science
CS 334.$            # automota
CS 383.$            # comp/org
CS 385[A-PR-Z]$     # all except the Q sections
CS 385R.$           # algorithms`;


$(function() {

	/*
	----------------
	PART I
	The initial schedule generation methods.
	----------------
	*/

	// this UI is a means of interacting with the scheduler class
	let scheduler = new Scheduler();
	scheduler.set_desired_classes([]);

	/*
	Reload the catalog according to #term's value.
	If successful, call success_callback().
	If failed, print errors.
	*/
	function reload_catalog(success_callback){
		let term = $('#term').val();
		scheduler.set_term(term);

		scheduler.reload_catalog(
			function(){
				print_status('successfully loaded ' + term + ' catalog.');
				success_callback();
			},
			function(){
				print_status('failed to load ' + term + ' catalog!');
				print_status('Either the term entered is invalid, or sitscheduler.com is malfunctioning.');
			}
		);
	}

	/*
	returns a list of class regexes, from the input in #classes
	(the class list on the left).
	*/
	function get_class_list() {
		let classes_input = $('#classes').val().split('\n');
		let my_classes = [];
		// for each line in class list.
		for (var classs of classes_input){
			if (classs.includes('#'))
				classs = classs.substr(0, classs.indexOf('#')); // don't count anything before "#" (indicating a comment)
			classs = classs.trim();		// remove whitespace
			if (classs == '') continue; // if empty line, ignore.
			my_classes.push(classs);
		}
		return my_classes;
	}

	/*
	This runs when the user presses "search".
	1) update scheduler.term with #term's value, and scheduler.desired_classes with get_class_list().
	2) reload the catalog (if necessary)
	3) search the catalog for sections that match class list regex
	4) report any missing classes and abort if necessary
	5) generate all possible schedules (very intensive, done in Scheduler class)
	6) enable filtering UI
	7) update the possible_schedules_list.
	*/
	function search() {
		// 1)
		print_status('updating inputs');
		scheduler.set_desired_classes(get_class_list());
		scheduler.set_term($('#term').val());

		// 2)
		print_status('reloading catalog');
		reload_catalog(function() {
			// 3)
			print_status('searching catalog');
			scheduler.add_sections();
			print_status('done searching');

			// 4)
			let missing = scheduler.any_missing();
			if(missing) {
				print_status('fatal error: missing "'+missing+'"');
				print_status('Either all sections are empty, or your search is invalid.');
				print_status('aborted');
				return;
			}

			// 5)
			print_status('creating all schedules...');
			scheduler.create_possible_schedule_tree();

			print_status('done');
			print_status('found '+scheduler.get_possible_schedule_count()+' possible schedules');
			$('#schedules').html('schedules found: '+scheduler.get_possible_schedule_count());
			
			// 6)
			$('#filtering').removeClass('disabled');
			
			// 7)
			possible_schedules();
		});
	}

	// automatically set 2019F, 2018S, etc. depending on time of year
	// if the month is less than 6, we're registering for Fall
	// otherwise, we are registering for Spring
	$('#term').val(''+(1900+new Date().getYear()) + (new Date().getMonth() < 6 ? 'F' : 'S'));


	// you can reset the classlist input to the default text by clicking "reset"
	$('#reset_classes').bind('click', function() {
		$('#classes').val(defaultclasses);
	});

	// if the user already has a classlist stored to cookies, retrieve it.
	// otherwise, set classlist to default sample text
	if(Cookies.get('classlist'))
		$('#classes').val(Cookies.get('classlist'));
	else
		$('#classes').val(defaultclasses);

	// class list input is stored to 'classlist' cookie whenever you type
	$('#classes').bind('input propertychange', function() {
		Cookies.set('classlist', $('#classes').val());
	});


	// search using the search button (right side)	
	$('#search_button').bind('click', search);


	/*
	----------------
	PART II
	The filtering of results
	----------------
	*/

	// the constant minimum and maximum hour of acceptable time selector
	const min = 5;	// 5AM
	const max = 22; // 10PM

	// current minimum hour and maximum hour of acceptable range
	// updated every time the times slider is changed (on mouse up)
	var min_hour = 8,  // 8AM
		max_hour = 17; // 5PM

	// list of possible schedules
	// of the form:
	// [
	// 		[seats_left, call_number_comma_seperated_string],
	//		...
	// ]
	var possible_schedules_list = [];

	/*
	updates possible_schedules_list, by filtering through scheduler.all_schedules
	according to whether a section fits in the acceptable time range (between min_hour
	and max_hour).
	*/
	function possible_schedules() {
		// clear list
		possible_schedules_list = [];

		// convert to seconds (this is the basis that we compare times with)
		min_secs = min_hour*60*60;
		max_secs = max_hour*60*60;

		A:
		for(let x of scheduler.all_schedules) {
			var seats = 0; // total seats in this schedule
			var callnums = []; // call numbers of sections in schedule

			// check if each meeting of section is within acceptable range.
			for(let y of x) {
				for (let meeting of y['meetings']) {

					// convert start/end time of meeting to seconds since 12AM
					var a = time2sec(meeting['start'].substr(0, meeting['start'].length-1));
					var b = time2sec(meeting['end'].substr(0, meeting['end'].length-1));
					
					// convert to Eastern standard time (we are at stevens, but they use UTC -00:00 Z!)
					a += 4*60*60;
					b += 4*60*60;

					// if meeting is not in range, skip this schedule
					if(!(a >= min_secs && b <= max_secs))
						continue A;
				}

				// if we got to this point in the loop, the section is acceptable.

				// add remaining seats to the total
				seats += y['seats'];

				// add the sections call number ID to the list 
				callnums.push(y['callnum']);
			}

			// insert the full schedule into possible_schedule_list, keeping the order from most seats available to least seats available:
			for(var i = 0; i <= possible_schedules_list.length; i++) {
				if(i == possible_schedules_list.length || seats > possible_schedules_list[i][0]) {
					possible_schedules_list.splice(i, 0, [seats, callnums]);
					break;
				}
			}
		}

		// update #possible_schedules
		$('#possible_schedules').html('filtered schedules: '+possible_schedules_list.length);
		
		// update filtered, sorted list of schedules
		$('#filtered_schedules').empty();
		for(let schedule of possible_schedules_list) {
			// create a link, of the form:
			// http://sitscheduler.com/#TERM=callnumber,callnumber,...
			// with text:
			// 340 seats, callnumber,callnumber,...
			let newline = document.createElement('a');
			newline.className = 'schedule_link';
			newline.innerHTML = schedule[0]+' seats, '+schedule[1];
			newline.href = 'http://sitscheduler.com/#'+scheduler.term+'='+schedule[1];
			
			// add link to list, with <BR> for newline
			$('#filtered_schedules').append(newline);
			$('#filtered_schedules').append(document.createElement('br'));
		}
	}

	// updates the #times_label with the new min and max hours range.
	function update_times_label(a,b){
		var A = new Date();
		A.setHours(a);
		A.setMinutes(0);

		var B = new Date();
		B.setHours(b);
		B.setMinutes(0);

		$("#times_label").html(formatAMPM(A) + " - " + formatAMPM(B));
	}

	// format a date object to "HH:MM AM"
	function formatAMPM(date) {
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0'+minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	}

	// we need a slider for acceptable hours of class times
	// create a new 2-knob slider!
	$('#times').slider({
		range: true,
		min: min,
		max: max,
		values: [min, max],
		slide: function( event, ui ) {
			min_hour = ui.values[0];
			max_hour = ui.values[1];
			update_times_label(min_hour,max_hour);
		}
	});

	// onmouseup (when user finishes changing acceptable range),
	// we update the possible schedules.
	// we *would* update every time the times change, but possible_schedules()
	// is very intensive.
	$('#times').mouseup(function(){
		possible_schedules();
	});

	// initialize the #times_label
	update_times_label(min,max);


	print_status('toomanyschedules.xyz')
	print_status('v1.0.1')
});