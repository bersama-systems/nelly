class BooksController < ApplicationController
    def index
        @books = Book.all
    end

    def show
        @book = Book.find_by(id: params[:id])
    end
    
    def new
        @book = Book.new
    end

    def create
        @book= Book.new(book_params)
        if @book.save
            redirect_to'/books', notice: 'New book added!'
        else
            render 'new'
        end
    end
    

    def edit
        @book = Book.find_by(id: params[:id])
        render 'new'
    end

    def update
        @book = Book.find_by(id: params[:id])
        if @book.update(book_params)
            redirect_to books_path, notice: 'Updated!'
        else 
            render 'new'
        end
    end

    def destroy 
        @book = Book.find_by(id: params[:id])
        @book.destroy
        redirect_to books_path, notice: "Deleted!"
    end
   
    private
    def book_params
        params.require(:book).permit(:title, :category, :price)
    end

    
end
