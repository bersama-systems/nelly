
class UsersController < ApplicationController

  before_action :check_auth, only: [:index, :show, :create]

  def check_auth
    if !is_authed?
      render status: :unauthorized, json: { error: "You are not authorized to access this resource. Verify that you are passing passing your token."}
      return false
    end
    true
  end

  def valid_new_user?(user)
    return false unless user
    return false if user[:email].blank? || user[:password].blank?
    found_user = User.where(email: user[:email]).first
    return false if found_user
    true
  end

  def index
    @users = User.all
    render json: @users
  end

  def create
    @param_user = params[:user]
    if !valid_new_user?(@param_user)
      render status: :unprocessable_entity, json: { error: "invalid data."}
      return
    end
    @user = User.new({email:@param_user[:email], password: @param_user[:password]})
    @user.save!
    render json: @user
  end

  def show
    @user = User.find_by_id(params[:id])
    render json: @user
  end
end

