fetch('https://fluxee.org/discover/?q=Jester').then(r=>r.text()).then(t=>{ 
    const match = /<h3 class="card-title">([\s\S]*?)<\/h3>/g;
    let m; 
    while((m=match.exec(t))!==null){
        console.log('--- FOUND ---');
        console.log(m[1].trim());
    } 
})
