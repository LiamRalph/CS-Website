async function tableSorter(){ 
    $("MapTable").trigger("destroy", [false]);

    let res = await fetch("/data/players/");
    let dataJSON = await res.json();

    let tableHead = document.getElementById("MapTableHead");
    tableHead.innerHTML="<tr><th> Team </th><th> Name </th><th> Maps </th><th> xKills </th><th> rWPA </th><th> XrWPA </th> </tr>";

    let table = document.getElementById("MapTableBody");
    table.innerHTML="";
    let tr="";
    dataJSON.filter(({maps}) => maps > 2).forEach(x=>{
        tr+='<tr>';
        tr+='<td>'+x.teamname.replaceAll('-', ' ')+'</td>'+'<td>'+x.name+'</td>'+'<td>'+x.maps+'</td>'+'<td>'+x.xkills.toFixed(2)+'</td>' +'<td>'+x.rwpa.toFixed(2)+'</td>' +'<td>'+x.exrwpa.toFixed(2)+'</td>'
        tr+='</tr>'
    })
    table.innerHTML+=tr;
    $("#MapTable").tablesorter({
        theme: 'default',
        sortList: [[3, 1]],
        headerTemplate: '{content}{icon}',
        widgets: ['zebra', 'uitheme']
    });
    $('#MapTable').trigger('update');
}