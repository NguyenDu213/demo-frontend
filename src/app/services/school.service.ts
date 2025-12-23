import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { School } from '../models/school.model';
import { ApiResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class SchoolService {
  private apiUrl = 'http://localhost:8080/api/schools';

  constructor(private http: HttpClient) {}

  // Hàm lấy Header có chứa Token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Lấy danh sách trường
  getAllSchools(): Observable<School[]> {
    console.log('[API Request] GET /schools');
    return this.http.get<ApiResponse<School[]>>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] GET /schools:', response)),
        map(response => response.data) // Bóc tách lấy data thật
      );
  }

  // Tìm kiếm trường
  searchSchools(name: string): Observable<School[]> {
    const params = new HttpParams().set('name', name);
    console.log('[API Request] GET /schools/search param:', name);
    return this.http.get<ApiResponse<School[]>>(`${this.apiUrl}/search`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(response => console.log('[API Response] Search:', response)),
      map(response => response.data)
    );
  }

  // Tạo mới trường
  createSchool(school: School): Observable<School> {
    console.log('[API Request] POST /schools Payload:', school);
    return this.http.post<ApiResponse<School>>(this.apiUrl, school, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('[API Response] POST /schools:', response)),
        map(response => response.data)
      );
  }

  // Cập nhật trường
  updateSchool(id: number, school: School): Observable<School> {
    console.log(`[API Request] PUT /schools/${id} Payload:`, school);
    return this.http.put<ApiResponse<School>>(`${this.apiUrl}/${id}`, school, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] PUT /schools/${id}:`, response)),
        map(response => response.data)
      );
  }

  // Xóa trường
  deleteSchool(id: number): Observable<void> {
    console.log(`[API Request] DELETE /schools/${id}`);
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log(`[API Response] DELETE /schools/${id}:`, response)),
        map(() => void 0)
      );
  }
}
