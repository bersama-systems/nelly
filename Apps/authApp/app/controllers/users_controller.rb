
class UsersController < ApplicationController

  before_action :check_auth, only: [:index, :show]

  def check_auth
    if !is_authed?
      render status: :unauthorized, json: { error: "You are not authorized to access this resource. Verify that you are passing passing your token."}
      return false
    end
    return true

  end
  def index
    @users = User.all
    render json: @users
  end

  def show
    @user = User.find_by_id(params[:id])
    render json: @user
  end
end

