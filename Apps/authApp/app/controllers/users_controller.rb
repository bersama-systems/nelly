
class UsersController < ApplicationController

  before_action :check_auth, only: [:index, :show, :create, :update]

  def check_auth
    if !is_authed? || !has_account?
      render status: :unauthorized, json: { error: "You are not authorized to access this resource. Verify that you are passing passing your token and account."}
      return false
    end
    true
  end

  def valid_new_user?(account_id, user)
    return false unless user
    return false if user[:email].blank? || user[:password].blank?
    found_user = User.where(account_id: account_id, email: user[:email]).first
    return false if found_user
    true
  end

  def valid_existing_user?(account_id, id, user)
    return nil unless user
    return nil if user[:password].blank?
    found_user = User.where(account_id: account_id, id: id).first
    return nil unless found_user
    found_user
  end

  def index
    @users = User.where(account_id: account)
    render json: @users
  end

  def create
    @param_user = params[:user]
    if !valid_new_user?(account, @param_user)
      render status: :unprocessable_entity, json: { error: "invalid data."}
      return
    end
    @user = User.new({account_id: account, email:@param_user[:email], password: @param_user[:password]})
    @user.save!
    render json: @user
  end

  def update
    @param_user = params[:user]
    unless found_user = valid_existing_user?(account, params[:id], @param_user)
      render status: :unprocessable_entity, json: { error: "invalid data." }
      return
    end
    found_user.password = @param_user[:password]
    found_user.save!
    render json: found_user
  end
  def show
    @user = User.where(account_id: account, id: params[:id]).first
    render json: @user
  end
end

