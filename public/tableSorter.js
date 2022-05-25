async function tableSorter(){ 
    $("MapTable").trigger("destroy", [false]);

    let res = await fetch("/data/players/");
    let dataJSON = await res.json();
    let table = document.getElementById("MapTableBody");
    console.log(dataJSON)
    table.innerHTML="";
    let tr="";
    dataJSON.forEach(x=>{
        tr+='<tr>';
        tr+='<td>'+x.teamname+'</td>'+'<td>'+x.name+'</td>'+'<td>'+x.maps+'</td>'+'<td>'+x.xkills.toFixed(2)+'</td>' +'<td>'+x.rwpa.toFixed(2)+'</td>' +'<td>'+x.exrwpa.toFixed(2)+'</td>'
        tr+='</tr>'
    })
    table.innerHTML+=tr;
    $("#MapTable").tablesorter({
        sortList: [[2, 1]]
    });
    $('#MapTable').trigger('update');
}