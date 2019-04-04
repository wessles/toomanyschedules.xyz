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

function print_status(status){
	var today = new Date();
	var time = today.toTimeString().split(' ')[0];

	let toadd = time + '\t' + status;
	let new_para = document.createElement('p');
	new_para.className = 'info-line';
	new_para.innerHTML = toadd;
	
	$('#info').append(new_para);
	console.log(toadd);
	let dom = $('#info').get(0);
	dom.scrollTop = dom.scrollHeight - dom.clientHeight;
}