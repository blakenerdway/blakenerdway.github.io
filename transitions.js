class PageCount{
    constructor(){
        this._currPage = 1;
        this._pageTransition = new PageTransition();
    }


    pageBackward(){
        if (this._currPage !== 1){
           this._pageTransition.pageBackward();
        }

        this._currPage--;
        if (this._currPage === 1){
            $('#page-backward').attr("disabled", true);
        }

        $('#page-forward').attr("disabled", false);
    };

    pageForward(){
        if (this._currPage !== 3) {
           this._pageTransition.pageForward();
        }


        this._currPage++;
        if (this._currPage === 3){
            $('#page-forward').attr("disabled", true);
        }
        $('#page-backward').attr("disabled", false);
    };
}

class PageTransition {
    constructor() {
    }

    pageBackward() {
        d3.select("#main-content-container").transition()
            .on("end", function() {
                console.log("Current page: " + pageCount._currPage);
                if (pageCount._currPage === 2){
                    new SecondScreen();
                }
                else {
                    new FirstScreen();
                }

                d3.select("#main-content-container").style("transform", "translateX(-100%)").transition().style("transform", "translateX(0%)")
                    .delay(200)
                    .duration(1500)
                    .ease(d3.easeCubicInOut);
            })
            .style("transform", "translateX(100%)").delay(0)
            .duration(1500)
            .ease(d3.easeCubicInOut);

    }

    pageForward() {
        d3.select("#main-content-container").transition()
            .on("end", () => {
                console.log("Current page: " + pageCount._currPage);
                if (pageCount._currPage === 2){
                    new SecondScreen();
                }


                d3.select("#main-content-container").style("transform", "translateX(100%)").transition().style("transform", "translateX(0%)")
                    .delay(200)
                    .duration(1500)
                    .ease(d3.easeCubicInOut);
            }).style("transform", "translateX(-100%)").delay(0)
            .duration(1500)
            .ease(d3.easeCubicInOut);
    }

}

function moveForward(){
    pageCount.pageForward();
}

function moveBackward(){
    pageCount.pageBackward();
}

pageCount = new PageCount();