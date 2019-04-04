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

$(function() {

	/*
	----------------
	PART I
	The initial schedule generation methods.
	----------------
	*/

	let scheduler = new Scheduler();
	scheduler.set_desired_classes([]);

	// automatically set 2019F, 2018S, etc.
	$('#term').val(''+(1900+new Date().getYear()) + (new Date().getMonth() < 6 ? 'F' : 'S'));

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

	if(Cookies.get('classlist')) {
		$('#classes').val(Cookies.get('classlist'));
	} else {
		$('#classes').val(defaultclasses);
	}

	$('#reset_classes').bind('click', function() {
		$('#classes').val(defaultclasses);
	});

	$('#classes').bind('input propertychange', function() {
		Cookies.set('classlist', $('#classes').val());
	});

	function reload_catalog(success_callback){
		let term = $('#term').val();
		scheduler.set_term(term);

		scheduler.reload_catalog(
			function(){
				print_status('successfully loaded ' + term + ' catalog.')
				success_callback()
			},
			function(){
				print_status('failed to load ' + term + ' catalog!')
			}
		);
	}

	function get_class_list() {
		let classes_input = $('#classes').val().split('\n');
		let my_classes = [];
		for (var classs of classes_input){
			if (classs.includes('#'))
				classs = classs.substr(0, classs.indexOf('#'));
			classs = classs.trim();
			if (classs == '')
				continue;
			my_classes.push(classs);
		}
		return my_classes;
	}

	function search() {
		print_status('updating inputs');
		scheduler.set_desired_classes(get_class_list());
		scheduler.set_term($('#term').val());

		print_status('reloading catalog');
		reload_catalog(function() {
			console.log(scheduler.catalog); 		// DEBUG
			
			print_status('searching catalog');
			scheduler.add_sections();
			print_status('done searching');

			console.log(scheduler.section_dict); 	// DEBUG

			let missing = scheduler.any_missing();
			if(missing) {
				print_status('fatal error: missing "'+missing+'"');
				print_status('aborted');
				return;
			}

			print_status('creating all schedules...');
			scheduler.create_possible_schedule_tree();
			print_status('done');
			print_status('found '+scheduler.get_possible_schedule_count()+' possible schedules');
			$('#schedules').html('schedules found: '+scheduler.get_possible_schedule_count());
			$('#filtering').removeClass('disabled');
			possible_schedules();
		});
	}
	$('#search_button').bind('click', search);


	/*
	----------------
	PART II
	The filtering of results
	----------------
	*/

	let min = 1;
	let max = 23;

	var min_hour = min, max_hour = max;

	var possible_schedules_list = [];

	function possible_schedules() {
		console.log(scheduler.all_schedules);

		possible_schedules_list = [];

		min_secs = min_hour*60*60;
		max_secs = max_hour*60*60;

		A:
		for(let x of scheduler.all_schedules) {
			var callnums = [];
			for(let y of x) {
				for (let meeting of y['meetings']) {
					var a = time2sec(meeting['start'].substr(0, meeting['start'].length-1));
					var b = time2sec(meeting['end'].substr(0, meeting['end'].length-1));
					
					a += 4*60*60;
					b += 4*60*60;


					if(!(a >= min_secs && b <= max_secs)) {
						continue A;
					}
				}
				callnums.push(y['callnum']);
			}
			possible_schedules_list.push(callnums);
		}

		$('#possible_schedules').html('filtered schedules: '+possible_schedules_list.length);
		$('#filtered_schedules').empty();
		for(let schedule of possible_schedules_list) {
			let newline = document.createElement('a');
			newline.className = 'schedule_link';
			newline.innerHTML = schedule;
			newline.href = 'http://sitscheduler.com/#'+scheduler.term+'='+schedule;
			$('#filtered_schedules').append(newline);
			$('#filtered_schedules').append(document.createElement('br'));
		}
	}

	/*
	-----------
	Time range slider
	-----------
	*/

	$('#times').slider({
		range: true,
		min: min,
		max: max,
		values: [min, max],
		slide: function( event, ui ) {
			min_hour = ui.values[0];
			max_hour = ui.values[1];
			update_times_label(min_hour,max_hour);
			possible_schedules();
		}
	});

	function update_times_label(a,b){
		var A = new Date();
		A.setHours(a);
		A.setMinutes(0);

		var B = new Date();
		B.setHours(b);
		B.setMinutes(0);

		$("#times_label").html(formatAMPM(A) + " - " + formatAMPM(B));
	}

	update_times_label(min,max);

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

	/*
	-----------
	Time range slider
	-----------
	*/

	tab_a = 0;
	tab_b = 0;



	$('#tabs').slider({
		range: true,
		min: 0,
		max: 0,
		values: [0, 0],
		slide: function( event, ui ) {
			tab_a = ui.values[0];
			tab_b = ui.values[1];
			update_times_label(tab_a,ui.tab_b);
			possible_schedules();
		}
	});

	/*
	----------------
	PART III
	The opening of filtered results
	----------------
	*/

	function open() {
		print_status('opening schedules');

	}
	$('#open_button').bind('click', open);


	print_status('toomanyschedules.xyz')
	print_status('v1.0.0')
});